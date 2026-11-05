import { NextFunction, Request, Response } from "express";
import logger from "../middleware/logger.js";
import { get_mf_transactions_query_schema } from "../lib/zod-schemas/mf-transaction.schema.js";
import { mf_transaction_plan_service } from "../services/mf-transaction-plan.service.js";

class MfTransactionControllerClass {

    /**
     * Paginated transaction history for the authenticated user.
     * Supports optional filtering by plan_type (PURCHASE/REDEMPTION/SWITCH),
     * systematic (true for SIP/SWP/STP, false for lumpsum), and state.
     * Includes enriched fund catalogue details (fund name, ISIN, AMC logo img_url, latest NAV).
     */
    get_user_transactions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user_id = req.user?.id!;
            const query = get_mf_transactions_query_schema.parse(req.query);

            logger.info("Fetching user MF transactions", {
                user_id,
                plan_type: query.plan_type,
                systematic: query.systematic,
                state: query.state,
                page: query.page,
                limit: query.limit,
            });

            const result = await mf_transaction_plan_service.get_paginated({
                user_id,
                plan_type: query.plan_type,
                systematic: query.systematic,
                state: query.state,
                page: query.page,
                limit: query.limit,
            });

            res.status(200).json({
                success: true,
                message: "Mutual fund transactions fetched successfully",
                data: {
                    transactions: result.items,
                    pagination: result.pagination,
                },
            });
            return;
        } catch (error) {
            logger.error("Error in get_user_transactions controller:", error);
            next(error);
            return;
        }
    };
}

export const mf_transaction_controller = new MfTransactionControllerClass();
