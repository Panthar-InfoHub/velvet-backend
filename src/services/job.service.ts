import { env } from "../lib/config-env.js";
import { Prisma } from "../prisma/generated/prisma/client.js";
import { chunkArray, logMemoryUsage } from "../lib/utils.js";
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
import logger from "../middleware/logger.js";
import { db } from "../server.js";


class JobServiceClass {

    daily_mf_product_job = async () => {

        logMemoryUsage("START OF JOB");

        const api_res = await axios.get(`${env.FINNSYS_MASTER_URL}`, {
            params: {
                gwname: "NSE",
                ...(env.ENVIRONMENT === "dev" && { tot: 5 })
            }
        }).then(res => res.data);

        const api_data: any[] = api_res.result ?? [];
        if (api_data.length === 0) return logger.info("No data received.");


        const batches = chunkArray(api_data, 1000);

        try {
            // --- START OF GLOBAL TRANSACTION ---
            // Everything inside this block is "All-or-Nothing"
            await db.$transaction(async (tx) => {

                for (const batch of batches) {


                    // -> Prepare MF Product Values
                    const product_values = batch.map((mf: any) => {
                        const navDate = mf.NAV_DATE ? new Date(mf.NAV_DATE) : new Date();
                        return Prisma.sql`(
                        ${uuidv4()}, ${String(mf.SCHM_ID)}, ${mf.ISIN}, ${mf.MAPPING_CODE}, ${mf.NSE_SCHEME_CODE}, ${mf.PLATFORM_SCHEME_CODE}, ${mf.SCHEME_NAME},
                        ${mf.AMC_ID ? String(mf.AMC_ID) : null}, ${mf.AMC_CODE}, ${mf.AMC_NAME}, 
                        ${mf.ASSET_TYPE}, ${mf.SCHEME_TYPE}, ${mf.STRUCTURE}, ${mf.RISK_NAME}, 
                        ${mf.RISK_ID ? parseInt(mf.RISK_ID) : null}, ${mf.NAV ? parseFloat(mf.NAV) : null},
                        ${navDate}, ${mf.PURCHASE_ALLOWED === "Y"}, ${mf.SIP_ALLOWED === "Y"}, 
                        ${mf.REDEMPTION_ALLOWED === "Y"}, ${mf.SWITCH_ALLOWED === "Y"}, NOW()
                    )`;
                    });

                    // -> Execute Bulk Upsert for Products?? why raw sql because prisma don't support upsertMany and we want to do this in 1 query for 30k records
                    await tx.$executeRaw`
                    INSERT INTO "MfProduct" (
                        id, scheme_id, isin, mapping_code, nse_scheme_code, platform_code, scheme_name, 
                        amc_id, amc_code, amc_name, asset_type, scheme_type, 
                        structure, risk_name, risk_level, latest_nav, 
                        latest_nav_date, purchase_allowed, sip_allowed, 
                        redemption_allowed, switch_allowed, "updatedAt"
                    )
                    VALUES ${Prisma.join(product_values)}
                    ON CONFLICT (scheme_id, isin, nse_scheme_code) DO UPDATE SET
                        latest_nav = EXCLUDED.latest_nav,
                        latest_nav_date = EXCLUDED.latest_nav_date,
                        purchase_allowed = EXCLUDED.purchase_allowed,
                        sip_allowed = EXCLUDED.sip_allowed,
                        redemption_allowed = EXCLUDED.redemption_allowed,
                        switch_allowed = EXCLUDED.switch_allowed,
                        "updatedAt" = NOW();
                `;

                    logger.info(`Batch of ${batch.length} products upserted successfully.`);

                    //->. Get UUIDs for the current batch (using the transaction client 'tx')
                    const products = await tx.mfProduct.findMany({
                        where: {
                            OR: batch.map(m => ({
                                scheme_id: String(m.SCHM_ID),
                                isin: m.ISIN,
                                nse_scheme_code: m.NSE_SCHEME_CODE
                            }))
                        },
                        select: { id: true, scheme_id: true, isin: true, nse_scheme_code: true }
                    });

                    // -> Create a Map for O(1) access to product IDs based on scheme_id
                    const productMap = new Map(products.map(p => [
                        `${p.scheme_id}-${p.isin}-${p.nse_scheme_code}`.toUpperCase(),
                        p.id
                    ]));
                    logger.debug(`Product Map created with ${productMap.size} entries.`);

                    // -> Prepare & Execute Metrics and Rules Bulk Upsert

                    const metricsValues: Prisma.Sql[] = [];
                    const ruleValues: Prisma.Sql[] = [];


                    for (const mf of batch) {
                        const tripleKey = `${mf.SCHM_ID}-${mf.ISIN}-${mf.NSE_SCHEME_CODE}`.toUpperCase();
                        const pId = productMap.get(tripleKey);
                        if (!pId) continue;

                        // Metrics Data
                        metricsValues.push(Prisma.sql`(
                        ${uuidv4()}, ${pId}, 
                        ${mf.THIRTY_DAY_RETURN ? parseFloat(mf.THIRTY_DAY_RETURN) : null}, 
                        ${mf.NINTY_DAY_RETURN ? parseFloat(mf.NINTY_DAY_RETURN) : null}, 
                        ${mf.ONE_YEAR_RETURN ? parseFloat(mf.ONE_YEAR_RETURN) : null}, 
                        ${mf.CHANGE ? parseFloat(mf.CHANGE) : null}, NOW())`);

                        // Transaction Rules Data
                        const sipDates = mf.SIP_DATES ? mf.SIP_DATES.split(",").map(Number) : [];
                        const freq = mf.SYSTEMATIC_FREQUENCIES ? mf.SYSTEMATIC_FREQUENCIES.split(",") : [];
                        ruleValues.push(Prisma.sql`(${uuidv4()}, ${pId}, ${sipDates}, ${freq}, NOW())`);
                    }



                    if (metricsValues.length > 0) {
                        await tx.$executeRaw`
                        INSERT INTO "MfMetrics" (id, mf_product_id, return_30d, return_90d, return_1y, nav_change_pct, "updatedAt")
                        VALUES ${Prisma.join(metricsValues)}
                        ON CONFLICT (mf_product_id) DO UPDATE SET
                            return_30d = EXCLUDED.return_30d,
                            return_90d = EXCLUDED.return_90d,
                            return_1y = EXCLUDED.return_1y,
                            nav_change_pct = EXCLUDED.nav_change_pct,
                            "updatedAt" = NOW();
                    `;
                    }
                    logger.info(`Batch of ${metricsValues.length} metrics upserted successfully.`);

                    if (ruleValues.length > 0) {
                        await tx.$executeRaw`
                        INSERT INTO "MfSchemeTransactionRules" (id, mf_product_id, sip_allowed_dates, sip_frequencies, "updatedAt")
                        VALUES ${Prisma.join(ruleValues)}
                        ON CONFLICT (mf_product_id) DO UPDATE SET
                            sip_allowed_dates = EXCLUDED.sip_allowed_dates,
                            sip_frequencies = EXCLUDED.sip_frequencies,
                            "updatedAt" = NOW();
                    `;
                    }
                    logger.info(`Batch of ${ruleValues.length} rules upserted successfully.`);

                }
            }, {
                timeout: 60000, // Increase timeout to 60s for 30k records
                maxWait: 10000
            });

            logger.info(`Daily MF Sync: 30,000 records synchronized atomically.`);
            return true;

        } catch (error) {
            logger.error("FATAL: Mutual Fund Job failed. Database rolled back to previous state.", error);
            throw error;
        } finally {
            logMemoryUsage("END OF JOB"); // Check if memory cleared or leaked
        }
    }


}

export const job_service = new JobServiceClass();