import { NextFunction, Request, Response } from "express";
import logger from "../../middleware/logger.js";
import { trading_account_service } from "../../services/kyc/trading.account.service.js";
import { generate_unique_code } from "../../helpers/unique.code.js";
import { NseRegistrationSchema } from "../../lib/zod-schemas/trading.account.schema.js";
import { user_service } from "../../services/user.service.js";
import AppError from "../../middleware/error.middleware.js";
import { mfkyc_identity_service } from "../../services/kyc/mfkyc.identity.service.js";

class TradingAccountControllerClass {
    create_trading_account = async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.info("Creating trading account for user id ==> ", req.user?.id);

            const raw_payload = {
                ...req.body,
                paperless_flag: "Z",
                client_code: generate_unique_code("VLVTINV"),
            };

            const result = NseRegistrationSchema.safeParse(raw_payload);

            if (!result.success) {
                logger.error("Validation failed for trading account creation ==> ", result.error);
                throw new AppError("Validation failed", 400, "VALIDATION_ERROR");
            }

            logger.debug("Trading account mandatory data is validated...")

            const data = await trading_account_service.client_registration(result.data);
            await user_service.update_user(req.user!.id, { nse_client_code: raw_payload.client_code });
            logger.info("Trading account created successfully for user id ==> ", req.user?.id, " with client code ==> ", raw_payload.client_code);

            res.status(200).json({
                success: true,
                message: "Trading account created successfully",
                data,
            });
            return;

        } catch (error) {
            logger.error("Error in creating trading account controller ==> ", error);
            next(error);
        }
    }

    pan_verification = async (req: Request, res: Response, next: NextFunction) => {
        try {

            const user_id = req.user?.id!;
            const pan_number = req.query.pan_number as string;
            logger.info("Initiating PAN verification for user id ==> ", user_id, " with PAN number ==> ", pan_number);

            const mf_kyc_identity = await mfkyc_identity_service.get_verified_details(user_id, pan_number);

            if (!mf_kyc_identity || mf_kyc_identity.pan_no != pan_number) {
                logger.warn("PAN verification failed for user id ==> ", user_id, " - PAN number mismatch");
                throw new AppError("PAN number does not match or KYC isn't completed yet", 400, "PAN_MISMATCH");
            }

            logger.info("PAN verification successful for user id ==> ", user_id);

            res.status(200).json({
                success: true,
                message: "PAN verification successful",
                data: mf_kyc_identity
            });
            return;

        } catch (error) {
            logger.error("Error in pan verification controller ==> ", error);
            next(error);
            return;
        }
    }
}

export const trading_account_controller = new TradingAccountControllerClass();