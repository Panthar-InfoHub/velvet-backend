import { NextFunction, Request, Response } from "express";
import logger from "../middleware/logger.js";
import { user_service } from "../services/user.service.js";

class UserFinanceControllerClass {
    async onboarding_create(req: Request) {
        const user = req.user!;
        const { current_step, ...data }: any = req.body;

        logger.debug(`Processing onboarding finance for User ID: ${user.id} with current_step: ${current_step}`);

        // const validated_data: UserFinanceInput = user_finance_zod_schema.parse(data);
        return await user_service.update_user(user.id, data);
    }


    async get_user(req: Request, res: Response, next: NextFunction) {
        try {

            const user_id: string = req.user!.id;
            logger.info(`Fetching user data for User ID: ${user_id}`);

            const data = await user_service.get_all_user_data(user_id, {
                user_goals: true,
                user_insurance: true,
                user_loan: true,
                user_assets: true,
                user_finance: true
            });

            logger.debug(`User data fetched successfully ==> `, data);

            res.status(200).json({
                code: 200,
                message: "User data fetched successfully",
                data
            });
            return;

        } catch (error) {
            logger.error(`Error in get_user: ${error}`);
            next(error);
            return;
        }
    }
}

export const user_controller = new UserFinanceControllerClass();