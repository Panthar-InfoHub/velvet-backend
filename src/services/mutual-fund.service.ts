import axios from "axios";
import logger from "../middleware/logger.js";
import { MfNavCreateManyInput, MfProductCreateInput } from "../prisma/generated/prisma/models.js";
import { db } from "../server.js";
import pLimit from "p-limit";

class MututalFundServiceClass {

    daily_mf_product_job = async () => {

        const apiData = await axios.get(`${process.env.MF_LATEST_URL}/mf/latest`).then(res => res.data);

        const existing = await db.mfProduct.findMany({
            select: { scheme_code: true }
        });

        const existingSet = new Set(existing.map(e => e.scheme_code));

        const to_insert: MfProductCreateInput[] = [];

        for (const mf of apiData) {
            if (!existingSet.has(mf.schemeCode)) {
                // Manually parse DD-MM-YYYY to YYYY-MM-DD
                let parsedDate: Date;
                if (typeof mf.date === 'string' && mf.date.includes('-')) {
                    const parts = mf.date.split('-');
                    if (parts.length === 3 && parts[0].length === 2) {
                        // Reorder from DD-MM-YYYY to YYYY-MM-DD
                        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    } else {
                        parsedDate = new Date(mf.date);
                    }
                } else {
                    parsedDate = new Date(mf.date);
                }

                // Skip if date is still invalid to avoid "Invalid time value" crash
                if (isNaN(parsedDate.getTime())) {
                    logger.error(`Skipping ${mf.schemeCode}: Invalid date format "${mf.date}"`);
                    continue;
                }

                to_insert.push({
                    scheme_code: String(mf.schemeCode),
                    scheme_name: mf.schemeName,
                    fund_house: mf.fundHouse,
                    scheme_type: mf.schemeType,
                    scheme_category: mf.schemeCategory,
                    latest_nav: mf.nav,
                    isin_growth: mf.isinGrowth ?? undefined,
                    isin_div_reinvestment: mf.isinDivReinvestment ?? undefined,
                    latest_nav_date: parsedDate,
                })
            }
        }


        if (to_insert.length > 0) {
            await db.mfProduct.createMany({
                data: to_insert,
                skipDuplicates: true
            });
        }

        logger.info(`Daily MF Product Job: Inserted ${to_insert.length} new products`);
        return true;
    }

    /**
     * Scheduled Job to fetch and store NAV history for mutual funds
     * Flow : 
     * 1. Fetch all mutual fund products from the database.
     * 2. For each product, call the external API to get NAV history.
     * 3. Store the NAV history in the database.
     * 
     * Returns : Success / Failure
     */

    nav_history_job = async () => {

        // endDate : YYYY-MM-DD format
        const endDate = (new Date()).toISOString().split('T')[0];
        logger.debug(`NAV History Job: Starting with endDate = ${endDate}`);

        // startDate : YYYY-MM-DD format : Last five years
        const startDate = (new Date(new Date().setFullYear(new Date().getFullYear() - 5))).toISOString().split('T')[0];
        logger.debug(`NAV History Job: Starting with startDate = ${startDate}`);

        const mf_products = await db.mfProduct.findMany({
            where: { last_synced_at: { lt: new Date(endDate) } },
            select: {
                id: true,
                scheme_code: true
            }
        });


        const limit = pLimit(5); // max 5 schemes at a time

        await Promise.all(
            mf_products.map(product =>
                limit(() => this.process_nav_history(product, startDate, endDate))
            )
        );

    }

    single_nav_history_job = async (scheme_code: string) => {
        const endDate = (new Date()).toISOString().split('T')[0];
        logger.debug(`NAV History Job: Starting with endDate = ${endDate}`);

        // startDate : YYYY-MM-DD format : Last five years
        const startDate = (new Date(new Date().setFullYear(new Date().getFullYear() - 5))).toISOString().split('T')[0];
        logger.debug(`NAV History Job: Starting with startDate = ${startDate}`);


        const mf_product = await db.mfProduct.findUnique({
            where: { scheme_code },
            select: {
                id: true,
                scheme_code: true
            }
        });

        if (!mf_product) {
            logger.warn(`Single NAV History Job: No product found for Scheme Code: ${scheme_code}`);
            return;
        }

        await this.process_nav_history(mf_product, startDate, endDate);
    }


    process_nav_history = async (product: { id: string, scheme_code: string }, startDate: string, endDate: string) => {
        try {
            const nav_history_data = await axios.get(`${process.env.MF_LATEST_URL}/mf/${product.scheme_code}`, {
                params: {
                    startDate,
                    endDate
                }
            }).then(res => res.data.data);

            /**
             * Data will be in descending order of date, ie endDate to startDate 
             * For example : for endDate = 2023-10-30 , startDate = 2018-10-30
             * [
             *   { navDate: '2023-10-30', nav: 150.25 },
             *   { navDate: '2023-10-29', nav: 149.75 },
             *   ...
             * ]
             */

            logger.debug(`Fetched NAV history for Scheme Code: ${product.scheme_code}, Records: ${nav_history_data.length}`);

            const to_insert: MfNavCreateManyInput[] = nav_history_data.map((nav_record: any) => {


                let parsedDate: Date;
                if (typeof nav_record.date === 'string' && nav_record.date.includes('-')) {
                    const parts = nav_record.date.split('-');
                    if (parts.length === 3 && parts[0].length === 2) {
                        // Reorder from DD-MM-YYYY to YYYY-MM-DD
                        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    } else {
                        parsedDate = new Date(nav_record.date);
                    }
                } else {
                    parsedDate = new Date(nav_record.date);
                }

                // Skip if date is still invalid to avoid "Invalid time value" crash
                if (isNaN(parsedDate.getTime())) {
                    logger.error(`Skipping ${product.scheme_code}: Invalid date format "${nav_record.date}"`);
                }

                return {
                    mf_product_id: product.id,
                    scheme_code: product.scheme_code,
                    nav_date: parsedDate,
                    nav_value: nav_record.nav,
                }
            });

            // Bulk insert NAV history, ignoring duplicates
            if (to_insert.length > 0) {

                await db.$transaction(async (tx) => {
                    const BATCH_SIZE = 1000;
                    for (let i = 0; i < to_insert.length; i += BATCH_SIZE) {
                        await tx.mfNav.createMany({
                            data: to_insert.slice(i, i + BATCH_SIZE),
                            skipDuplicates: true
                        });
                    }
                    // 5. Mark as synced so we don't retry this fund on crash
                    await tx.mfProduct.update({
                        where: { id: product.id },
                        data: { last_synced_at: new Date() }
                    });
                });
            }

            logger.info(`NAV History Job: Inserted ${to_insert.length} records for Scheme Code: ${product.scheme_code}`);
        } catch (error) {
            logger.error(`Error fetching/storing NAV history for Scheme Code: ${product.scheme_code}`, error);
        }
    }



    get_mutual_fund_by_scheme_code = async (scheme_code: string) => {
        const mf_product = await db.mfProduct.findUnique({
            where: { scheme_code },
            select: {
                id: true,
                scheme_code: true
            }
        });

        return mf_product;
    }

}


export const mututal_funds_service = new MututalFundServiceClass();