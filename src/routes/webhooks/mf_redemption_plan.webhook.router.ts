import { Router } from "express";
import { handleMfRedemptionPlanWebhook } from "../../controller/webhooks/mf_redemption_plan.webhook.controller.js";

export const mf_redemption_plan_webhook_router = Router();

mf_redemption_plan_webhook_router.post("/", handleMfRedemptionPlanWebhook);