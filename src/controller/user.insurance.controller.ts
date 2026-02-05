import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import logger from "../middleware/logger.js";
import { user_insurance_service } from "../services/onboarding/user.insurance.service.js";
import AppError from "../middleware/error.middleware.js";

// Zod Schema for User Insurance
const user_insurance_zod_schema = z.object({
    life_insurance: z.number().min(0).optional().default(0),
    health_insurance: z.number().min(0).optional().default(0),
});

type UserInsuranceInput = z.infer<typeof user_insurance_zod_schema>;

class UserInsuranceControllerClass {
    async onboarding_create(req: Request) {
        const user = req.user!;
        const data = req.body;

        logger.debug(`Processing onboarding insurance for User ID: ${user.id}`);

        const validated_data: UserInsuranceInput = user_insurance_zod_schema.parse(data);
        return await user_insurance_service.create(user.id, validated_data);
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await this.onboarding_create(req);

            res.status(200).json({
                success: true,
                message: "Insurance details saved successfully",
                data: result
            });
            return;
        } catch (error) {
            logger.error("Error in create insurance:", error);
            next(error);
            return;
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const data = req.body;

            const validated_data: UserInsuranceInput = user_insurance_zod_schema.parse(data);

            const result = await user_insurance_service.update(user.id, validated_data);

            res.status(200).json({
                success: true,
                message: "Insurance details updated successfully",
                data: result
            });
            return;
        } catch (error) {
            logger.error("Error in update insurance:", error);
            next(error);
            return;
        }
    }

    async get(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const result = await user_insurance_service.get_by_user(user.id);

            if (!result) {
                throw new AppError("Insurance details not found", 404);
            }

            res.status(200).json({
                success: true,
                message: "Insurance details fetched successfully",
                data: result
            });
            return;
        } catch (error) {
            logger.error("Error in get insurance:", error);
            next(error);
            return;
        }
    }
}

export const user_insurance_controller = new UserInsuranceControllerClass();
