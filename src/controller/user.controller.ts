import { Request } from "express";
import logger from "../middleware/logger.js";
import { user_service } from "../services/user.service.js";

class UserFinanceControllerClass {
    async onboarding_create(req: Request) {
        const user = req.user!;
        const data = req.body;

        logger.debug(`Processing onboarding finance for User ID: ${user.id}`);

        // const validated_data: UserFinanceInput = user_finance_zod_schema.parse(data);
        return await user_service.update_user(user.id, data);
    }
}

export const user_controller = new UserFinanceControllerClass();