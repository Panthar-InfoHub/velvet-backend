import { NextFunction, Request, Response } from "express";
import AppError from "../middleware/error.middleware.js";
import logger from "../middleware/logger.js";
import { complete_onboarding_zod_schema } from "../lib/zod-schemas/onboarding.schema.js";
import { onboarding_service } from "../services/onboarding.service.js";

class OnBoardingControllerClass {
    complete_onboarding = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user?.id) {
                throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
            }

            const validation_result = complete_onboarding_zod_schema.safeParse(req.body);
            if (!validation_result.success) {
                logger.error("Validation failed for complete_onboarding ==> ", validation_result.error);
                throw new AppError("Validation failed", 400, "VALIDATION_ERROR");
            }

            const result = await onboarding_service.complete_onboarding(user, validation_result.data);

            logger.info(`Onboarding completed for user: ${user.id}`);

            res.status(200).json({
                success: true,
                message: "Onboarding completed successfully",
                data: result,
            });
            return;

        } catch (error) {
            logger.error("Error in complete_onboarding:", error);
            next(error);
            return;
        }
    }
}

export const onboarding_controller = new OnBoardingControllerClass();