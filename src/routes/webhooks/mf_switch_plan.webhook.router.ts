import { Router } from "express";
import { handleMfSwitchPlanWebhook } from "../../controller/webhooks/mf_switch_plan.webhook.controller.js";

export const mf_switch_plan_webhook_router = Router();

mf_switch_plan_webhook_router.post("/", handleMfSwitchPlanWebhook);