import { Router } from "express";
import { mutual_fund_controller } from "../controller/mutual-fund.controller.js";
import { login_require } from "../middleware/session.middleware.js";

export const mututal_fund_router = Router();

mututal_fund_router.get("/", mutual_fund_controller.get_mutual_funds);
mututal_fund_router.get("/history/:id", mutual_fund_controller.get_mutual_fund_history);
mututal_fund_router.get("/:id", mutual_fund_controller.get_mutual_fund_by_id);


// Purchasing Mutualfunds
mututal_fund_router.post("/lumpsum-cart", login_require, mutual_fund_controller.add_to_lumpsum_cart);