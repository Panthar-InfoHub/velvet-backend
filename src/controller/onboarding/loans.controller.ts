import { NextFunction, Request, Response } from "express";
import AppError from "../../middleware/error.middleware.js";
import { onboarding_loans_schema } from "../../lib/zod-schemas/onboarding.schema.js";
import { user_loan_service } from "../../services/onboarding/user.loan.service.js";
import { user_onboarding_service } from "../../services/kyc/user.onboarding.service.js";

class LoansOnboardingControllerClass {
    create = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const user = req.user;

            if (!user?.id) {
                throw new AppError(
                    "Unauthorized",
                    401,
                    "UNAUTHORIZED",
                );
            }

            const validation_result =
                onboarding_loans_schema.safeParse(req.body);

            if (!validation_result.success) {
                throw new AppError(
                    "Validation failed",
                    400,
                    "VALIDATION_ERROR",
                );
            }

            await user_loan_service.sync(
                user.id,
                validation_result.data,
            );

            await user_onboarding_service.update_stage(
                user.id,
                {
                    loan_status: "VERIFIED",
                    current_stage: "INSURANCE_DETAILS",
                },
            );

            await user_onboarding_service.recompute_completion(
                user.id,
            );

            res.status(200).json({
                success: true,
                message: "Loan details saved successfully",
                data: validation_result.data,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const loans_onboarding_controller =
    new LoansOnboardingControllerClass();