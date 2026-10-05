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

            const loans_data = Array.isArray(req.body)
                ? req.body
                : req.body?.loans ?? req.body;

            const validation_result =
                onboarding_loans_schema.safeParse(loans_data);

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

            const onboarding =
                await user_onboarding_service.get_status_summary(
                    user.id,
                );

            res.status(200).json({
                success: true,
                message: "Loan details saved successfully",
                data: validation_result.data,
                onboarding,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const loans_onboarding_controller =
    new LoansOnboardingControllerClass();