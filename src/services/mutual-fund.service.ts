import axios from "axios";
import logger from "../middleware/logger.js";
import { db } from "../server.js";
import pLimit from "p-limit";
import type { MfNavHistoryCreateManyInput, MfProductOrderByWithRelationInput, MfProductWhereInput } from "../prisma/generated/prisma/models.js";
import { Lumpsum_cart_data } from "../lib/types.js";
import { env } from "../lib/config-env.js";
import AppError from "../middleware/error.middleware.js";


export type pagination = {
    page: number;
    limit: number;
}



class MututalFundServiceClass {

    finnsys_base_url: string;

    constructor() {
        this.finnsys_base_url = env.finsys_base_api;
    }



    get_mutual_funds = async ({ pagination, query, order }: { pagination: pagination, query?: MfProductWhereInput, order?: MfProductOrderByWithRelationInput }) => {
        const { page, limit } = pagination;
        const offset = (page - 1) * limit;

        const where = query ? query : {};

        const [total, data] = await Promise.all([
            db.mfProduct.count({ where }),
            db.mfProduct.findMany({
                where,
                include: {
                    metrics: {
                        select: {
                            return_3y: true,
                            return_1y: true,
                            return_90d: true,
                            return_6m: true
                        }
                    }
                },
                skip: offset,
                take: limit,
                orderBy: order ? order : { scheme_name: 'asc' }
            })
        ]);

        return {
            mutual_funds: data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    get_mutual_fund_by_id = async (id: string) => {
        return await db.mfProduct.findUnique({
            where: { id },
            include: {
                metrics: {
                    select: {
                        return_30d: true,
                        return_90d: true,
                        return_6m: true,
                        return_1y: true,
                        return_3y: true,
                        nav_change_pct: true
                    }
                },
                transaction_rules: {
                    select: {
                        sip_allowed_dates: true,
                        sip_frequencies: true
                    }
                }
            }
        });
    }

    get_mutual_fund_history = async (id: string) => {
        return await db.mfNavHistory.findMany({
            where: { mf_product_id: id },
            orderBy: { nav_date: 'desc' }
        });
    }

    get_only_mf_product = async (id: string) => {
        return await db.mfProduct.findUnique({
            where: { id },
            select: { id: true, scheme_id: true, scheme_name: true, mapping_code: true }
        });
    }




    // Purchasing service lumpsum and sip to finnsys cart

    add_lumpsum_cart = async (lumpsum_data: Lumpsum_cart_data, user_data: { log: string, pwd: string }) => {
        try {

            // https://jantanivesh.com/finnsys/app/master.service.asp?log=nimit691&pwd=64119&svc=addcartlumpsum&sub_txn_type=N&amc_code=D&amc_name=Edelweiss Mutual Fund&prod_code=EDEIRD-DR&prod_name=EDELWEISS EQUITY SAVINGS FUND - REGULAR PLAN - IDCW REINVESTMENT&reinv_flag=Y&txn_amount=10000
            const response = await axios.get(`${this.finnsys_base_url}/finnsys/app/master.service.asp`, {
                params: {
                    log: user_data.log,
                    pwd: user_data.pwd,
                    svc: 'addcartlumpsum',
                    sub_txn_type: 'N',
                    amc_code: lumpsum_data.amc_code,
                    amc_name: lumpsum_data.amc_name,
                    prod_code: lumpsum_data.prod_code,
                    prod_name: lumpsum_data.prod_name,
                    reinv_flag: lumpsum_data.reinv_flag || 'Y',
                    txn_amount: lumpsum_data.txn_amount
                }
            });

            logger.debug("Add to lumpsum cart response ==> ", response.data);
            return response.data;

        } catch (error) {
            logger.error("Error adding to lumpsum cart service ==> ", error);
            throw new AppError("Failed to add to lumpsum cart", 500, "ADD_TO_CART_ERROR");
        }
    }











    /**
     * Scheduled Job to fetch and store NAV history for mutual funds
     * Flow :
     * 1. Fetch all mutual fund products from the database.
     * 2. For each product, call the external API to get NAV history.
     * 3. Store the NAV history in the database.
     */
    nav_history_job = async () => {

        const endDate = (new Date()).toISOString().split('T')[0];
        const startDate = (new Date(new Date().setFullYear(new Date().getFullYear() - 5))).toISOString().split('T')[0];

        logger.debug(`NAV History Job: startDate=${startDate} endDate=${endDate}`);

        const mf_products = await db.mfProduct.findMany({
            select: { id: true, scheme_id: true, mapping_code: true }
        });

        const limit = pLimit(5);

        await Promise.all(
            mf_products.map(product =>
                limit(() => this.process_nav_history(product, startDate, endDate))
            )
        );
    }

    single_nav_history_job = async (scheme_code: string) => {

        // const scheme_id: any = await this.get_only_mf_product(scheme_code).then(product => product?.mapping_code);

        const endDate = (new Date()).toISOString().split('T')[0];
        const startDate = (new Date(new Date().setFullYear(new Date().getFullYear() - 5))).toISOString().split('T')[0];

        logger.debug(`Single NAV History Job: startDate=${startDate} endDate=${endDate}`);

        const mf_product = await db.mfProduct.findFirst({
            where: { id: scheme_code },
            select: { id: true, scheme_id: true, mapping_code: true }
        });

        if (!mf_product) {
            logger.warn(`Single NAV History Job: No product found for id: ${scheme_code}`);
            return;
        }

        await this.process_nav_history(mf_product, startDate, endDate);
    }

    process_nav_history = async (product: { id: string; scheme_id: string, mapping_code: string }, startDate: string, endDate: string) => {
        try {
            const nav_history_data = await axios.get(`${process.env.MF_LATEST_URL}/mf/${product.mapping_code}`, {
                params: { startDate, endDate }
            }).then(res => res.data.data);

            logger.debug(`Fetched NAV history for scheme_id: ${product.mapping_code}, Records: ${nav_history_data.length}`);

            const to_insert: MfNavHistoryCreateManyInput[] = nav_history_data.map((nav_record: any) => {
                let parsedDate: Date;
                if (typeof nav_record.date === 'string' && nav_record.date.includes('-')) {
                    const parts = nav_record.date.split('-');
                    if (parts.length === 3 && parts[0].length === 2) {
                        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    } else {
                        parsedDate = new Date(nav_record.date);
                    }
                } else {
                    parsedDate = new Date(nav_record.date);
                }

                if (isNaN(parsedDate.getTime())) {
                    logger.error(`Skipping ${product.scheme_id}: Invalid date format "${nav_record.date}"`);
                }

                return {
                    mf_product_id: product.id,
                    scheme_id: product.mapping_code,
                    nav_date: parsedDate,
                    nav: nav_record.nav,
                } satisfies MfNavHistoryCreateManyInput;
            });

            if (to_insert.length > 0) {
                await db.$transaction(async (tx) => {
                    const BATCH_SIZE = 1000;
                    for (let i = 0; i < to_insert.length; i += BATCH_SIZE) {
                        await tx.mfNavHistory.createMany({
                            data: to_insert.slice(i, i + BATCH_SIZE),
                            skipDuplicates: true
                        });
                    }
                });
            }

            logger.info(`NAV History Job: Inserted ${to_insert.length} records for scheme_id: ${product.scheme_id}`);
        } catch (error) {
            logger.error(`Error fetching/storing NAV history for scheme_id: ${product.scheme_id}`, error);
        }
    }

    get_mutual_fund_by_scheme_id = async (scheme_id: string) => {
        return await db.mfProduct.findFirst({
            where: { scheme_id },
            select: { id: true, scheme_id: true }
        });
    }
}

export const mututal_funds_service = new MututalFundServiceClass();