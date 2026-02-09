import { NextFunction, Request, Response } from "express";
import logger from "../middleware/logger.js";
import AppError from "../middleware/error.middleware.js";
import { mututal_funds_service } from "../services/mutual-fund.service.js";

class JobControllerClass {

    daily_mf_job = async (req: Request, res: Response, next: NextFunction) => {
        try {

            const scheduler_token = req.headers["x-scheduler-token"];
            const secret = process.env.SCHEDULER_SECRET || "default_secret";

            if (scheduler_token !== secret) {
                console.warn(`[SECURITY] Unauthorized attempt to access daily mf job with token: ${scheduler_token}`);
                throw new AppError("Unauthorized: Invalid or missing scheduler token", 401, "Unauthorized");
            }

            logger.info("Running daily mutual fund job...");

            await mututal_funds_service.daily_mf_product_job();

        } catch (error) {
            logger.error("Error while running daily mf job ==> ", error);
            next(error);
            return;
        }
    }

}

export const job_controller = new JobControllerClass();