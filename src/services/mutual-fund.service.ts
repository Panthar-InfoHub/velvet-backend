import axios from "axios";
import logger from "../middleware/logger.js";
import { MfProductCreateInput } from "../prisma/generated/prisma/models.js";
import { db } from "../server.js";

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
                to_insert.push({
                    scheme_code: mf.schemeCode,
                    scheme_name: mf.schemeName,
                    fund_house: mf.fundHouse,
                    scheme_type: mf.schemeType,
                    scheme_category: mf.schemeCategory,
                    latest_nav: mf.latestNav,
                    latest_nav_date: new Date(mf.latestNavDate),
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
}


export const mututal_funds_service = new MututalFundServiceClass();