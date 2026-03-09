import { NextFunction, Request, Response } from "express";
import { promisify } from "util";
import { gzip, gunzip } from "zlib";
import logger from "../middleware/logger.js";
import { mututal_funds_service } from "../services/mutual-fund.service.js";
import { redis, redis_buffer_client } from "../lib/redis.js";
import { decompressAndFilter, get_mf_search_query } from "../lib/utils.js";

const gzipAsync = promisify(gzip);

// Proxy client that returns Buffers instead of strings (node-redis v5 API)


class MutualFundControllerClass {

    get_mutual_funds = async (req: Request, res: Response, next: NextFunction) => {
        try {

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            //Filters
            const sort_by = req.query.sort_by as string
            const category = req.query.category as string
            const risk = parseInt(req.query.risk as string)

            logger.info(`Fetching mutual funds - Page: ${page}, Limit: ${limit}`);
            const { query, order } = get_mf_search_query({ category, risk, sort_by });

            const result = await mututal_funds_service.get_mutual_funds({
                pagination: { page, limit },
                query,
                order
            });

            logger.debug(`Fetched ${result.mutual_funds.length} mutual funds from database`);

            res.status(200).json({
                success: true,
                message: "Mutual funds fetched successfully",
                data: result
            });
            return;

        } catch (error) {
            logger.error("Error in get_mutual_funds:", error);
            next(error);
            return;
        }

    }


    get_mutual_fund_by_id = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            logger.info(`Fetching mutual fund by id: ${id}`);

            const mf_detail_key = `mf:id:${id}`;
            const cached_details = await redis.get(mf_detail_key)

            if (cached_details) {
                logger.debug(`Cache Hit for MF ID: ${id}`);

                res.status(200).json({
                    success: true,
                    message: "Mutual fund fetched successfully (from cache)",
                    data: JSON.parse(cached_details)
                });
                return;
            }

            logger.debug(`Cache Miss for MF ID: ${id}. Fetching from database...`);
            const result = await mututal_funds_service.get_mutual_fund_by_id(id);

            await redis.set(mf_detail_key, JSON.stringify(result), { EX: 60 * 60 })
            logger.debug(`Fetched and cached mutual fund by id: ${id}`);

            res.status(200).json({
                success: true,
                message: "Mutual fund fetched successfully",
                data: result
            });
            return;
        } catch (error) {
            logger.error("Error in get_mutual_fund_by_id:", error);
            next(error);
            return;
        }
    }


    get_mutual_fund_history = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const period = req.query.period as string || "1y";
            const history_key = `mf:h:${id}`;

            logger.info(`Fetching history for MF: ${id}, period: ${period}`);

            const compressedHistory = await redis_buffer_client.get(history_key);

            if (compressedHistory) {
                logger.debug(`Cache Hit for History: ${id}`);
                const nav_history = await decompressAndFilter(compressedHistory as Buffer, period);

                return res.status(200).json({
                    success: true,
                    message: "History fetched successfully (from cache)",
                    data: nav_history
                });
            }

            logger.debug(`Cache Miss for History: ${id}. Get from DB...`);
            const fullHistory = await mututal_funds_service.get_mutual_fund_history(id);

            if (!fullHistory) {
                logger.warn(`No history found for MF ID: ${id}, returning empty array response`);
                return res.status(200).json({ success: true, message: "History not found", data: [] });
            }

            const compressed = await gzipAsync(JSON.stringify(fullHistory));
            await redis_buffer_client.set(history_key, compressed, { EX: 86400 });

            const filteredHistory = await decompressAndFilter(compressed, period);

            res.status(200).json({
                success: true,
                message: "History fetched successfully",
                data: filteredHistory
            });
            return;
        } catch (error) {
            logger.error("Error in get_mutual_fund_history:", error);
            next(error);
            return;
        }
    }


}

export const mutual_fund_controller = new MutualFundControllerClass();