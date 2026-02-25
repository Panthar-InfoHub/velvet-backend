import { Router } from "express";
import { kyc_controller } from "../controller/kyc/kyc.controller.js";
import { login_require } from "../middleware/session.middleware.js";

export const kyc_router = Router();

kyc_router.post("/initiate", login_require, kyc_controller.initiate_kyc)
kyc_router.post("/details", login_require, kyc_controller.user_digiliocker_data)
kyc_router.post("/update", login_require, kyc_controller.update_kyc_data)
kyc_router.patch("/doc", login_require, kyc_controller.update_doc)
kyc_router.post("/contract", login_require, kyc_controller.create_contract)
kyc_router.get("/verify", login_require, kyc_controller.verify_kyc)