import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import logger from "../middleware/logger.js";
import { user_finance_service } from "../services/onboarding/user.finance.service.js";
import AppError from "../middleware/error.middleware.js";

// Zod Schema for User Finance
const user_finance_zod_schema = z.object({
    annual_income: z.number().min(0).optional(),
    expense_house: z.number().min(0).default(0).optional(),
    expense_food: z.number().min(0).default(0).optional(),
    expense_transportation: z.number().min(0).default(0).optional(),
    expense_others: z.number().min(0).default(0).optional(),
});

type UserFinanceInput = z.infer<typeof user_finance_zod_schema>;

class UserFinanceControllerClass {
    async onboarding_create(req: Request) {
        const user = req.user!;
        const data = req.body;

        logger.debug(`Processing onboarding finance for User ID: ${user.id}`);

        const validated_data: UserFinanceInput = user_finance_zod_schema.parse(data);
        return await user_finance_service.create(user.id, validated_data);
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await this.onboarding_create(req);

            res.status(200).json({
                success: true,
                message: "Finance details created successfully",
                data: result
            });
            return;
        } catch (error) {
            logger.error("Error in create finance:", error);
            next(error);
            return;
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const data = req.body;

            // Partial validation for update or keep it strict as per requirement
            const validated_data: UserFinanceInput = user_finance_zod_schema.parse(data);

            const result = await user_finance_service.update(user.id, validated_data);

            res.status(200).json({
                success: true,
                message: "Finance details updated successfully",
                data: result
            });
            return;
        } catch (error) {
            logger.error("Error in update finance:", error);
            next(error);
            return;
        }
    }

    async get_user_finance(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            const result = await user_finance_service.get_by_user(user.id);

            if (!result) {
                throw new AppError("Finance details not found", 404);
            }

            res.status(200).json({
                success: true,
                message: "Finance details fetched successfully",
                data: result
            });
            return;
        } catch (error) {
            logger.error("Error in get finance:", error);
            next(error);
            return;
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user!;
            await user_finance_service.delete(user.id);

            res.status(200).json({
                success: true,
                message: "Finance details deleted successfully"
            });
            return;
        } catch (error) {
            logger.error("Error in delete finance:", error);
            next(error);
            return;
        }
    }
}

export const user_finance_controller = new UserFinanceControllerClass();
