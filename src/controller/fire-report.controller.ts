import { NextFunction, Request, Response } from "express";
import { fire_report_service } from "../services/fire.report.service.js";
import logger from "../middleware/logger.js";

export const fire_report_controller = {
    async get_fire_report(req: Request, res: Response, next: NextFunction) {
        try {
            const user_id: string = req.user!.id;

            logger.info(`Generating FIRE report for user_id: ${user_id}`);

            const data = await fire_report_service.get_fire_report(user_id);
            res.status(200).json({
                code: 200,
                message: "FIRE report generated successfully",
                data
            });
        } catch (error) {
            logger.error(`Error generating FIRE report: ${error instanceof Error ? error.message : String(error)}`);
            next(error);
            return;
        }
    },
};
