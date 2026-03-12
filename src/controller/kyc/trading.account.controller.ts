import { NextFunction, Request, Response } from "express";
import logger from "../../middleware/logger.js";
import { trading_account_service } from "../../services/kyc/trading.account.service.js";
import { generate_unique_code } from "../../helpers/unique.code.js";
import { NseRegistrationSchema } from "../../lib/zod-schemas/trading.account.schema.js";
import { user_service } from "../../services/user.service.js";
import AppError from "../../middleware/error.middleware.js";
import { mfkyc_identity_service } from "../../services/kyc/mfkyc.identity.service.js";
import { kyc_finnsys_service } from "../../services/kyc/kyc.finnsys.service.js";

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
            logger.info(`Initiating PAN verification for user id ==> ${user_id} with PAN number ==> ${pan_number}`);

            let pan_verified = true;
            let app_verified = true;

            /**
             * PAN verification logic:
             * 1. Call Finnsys API to verify PAN number : Checking if the PAN number is valid and matches the user's name as per government records..
             * -> Why? User have already KYC from anyother app
             * 
             * 2. Call MF KYC Identity service to get verified details for the user : Checking if the user has completed KYC and the PAN number matches with the one provided by user.
             * -> Why? User might have completed KYC but PAN verification might be pending or failed. We need to ensure that PAN is verified and KYC is completed before allowing user to create trading account.
             */


            const [pan_verification_result, mf_kyc_identity] = await Promise.all([
                kyc_finnsys_service.pan_verification(pan_number),
                mfkyc_identity_service.get_verified_details(user_id, pan_number)
            ]);

            logger.debug("PAN verification result from Finnsys ==> ", pan_verification_result);
            logger.debug("MF KYC identity details ==> ", mf_kyc_identity);

            if (pan_verification_result.code as any != "1") {
                logger.warn(`PAN verification failed for user id ==> ${user_id} with PAN number ==> ${pan_number}. Finnsys response code ==> ${pan_verification_result.code}`);
                pan_verified = false;
                throw new AppError("PAN verification failed", 400, "PAN_VERIFICATION_FAILED");
            }

            if (!mf_kyc_identity || mf_kyc_identity.pan_no != pan_number) {
                logger.warn(`PAN verification failed for user id ==> ${user_id} with PAN number ==> ${pan_number}. PAN number mismatch`);
                app_verified = false;
                // throw new AppError("PAN number does not match or App KYC isn't completed yet", 400, "PAN_MISMATCH");
            }

            logger.info("PAN verification successful for user id ==> ", user_id);

            res.status(200).json({
                success: true,
                message: "PAN verification successful",
                data: {
                    pan_verified,
                    app_verified,
                    ...mf_kyc_identity,
                    full_name: pan_verification_result.firstPanName,
                }
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