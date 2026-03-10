import { NextFunction, Request, Response } from "express";
import { user_finance_controller } from "./user.finance.controller.js";
import AppError from "../middleware/error.middleware.js";
import { user_assets_controller } from "./user.assests.controller.js";
import { user_loan_controller } from "./user.loan.controller.js";
import { user_goal_controller } from "./user.goal.controller.js";
import { user_insurance_controller } from "./user.insurance.controller.js";
import { user_service } from "../services/user.service.js";
import { user_controller } from "./user.controller.js";
import logger from "../middleware/logger.js";

interface StepController {
    onboarding_create: (req: Request) => Promise<any>;
    update?: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    get?: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

class OnBoardingControllerClass {

    private get_controller_class = (step: number): StepController => {
        switch (step) {
            case 1:
                return user_controller
            case 2:
                return user_finance_controller;
            case 3:
                return user_assets_controller;
            case 4:
                return user_insurance_controller;
            case 5:
                return user_loan_controller;
            case 6:
                return user_goal_controller;
            default:
                throw new AppError("Invalid onboarding step");
        }
    }

    /**
     * Complete current onboarding step 
     * Data required : current step , respective data
     * Flow : Get Respective service layer of the step -> Call create or update based on existing data
     * Returns : Success / Failure response
     *  */

    complete_step = async (req: Request, res: Response, next: NextFunction) => {
        try {

            const data = req.body;
            const current_step: number = data.current_step;

            if (!current_step) {
                logger.error("current_step is required in request body");
                throw new AppError("current_step is required", 400);
            }

            const controller_class = this.get_controller_class(current_step);

            await controller_class.onboarding_create(req);

            logger.debug("Onboarding step completed... Updating user meta data");

            // Update user meta data for onboarding step completion
            await user_service.update_user(req.user!.id, {
                meta_data: {
                    current_onboarding_step: current_step,
                    is_onboarding_completed: current_step >= 6 ? true : false
                }
            });

            res.status(200).json({
                success: true,
                message: "Onboarding step completed successfully",
                data: {
                    current_onboarding_step: current_step,
                    is_onboarding_completed: current_step >= 6 ? true : false
                }
            })

        } catch (error) {
            console.error("Error in complete_step:", error);
            next(error);
            return;
        }
    }

}

export const onboarding_controller = new OnBoardingControllerClass();