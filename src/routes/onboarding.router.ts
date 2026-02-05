import { Router } from "express";
import { onboarding_controller } from "../controller/onboarding.controller.js";

export const onboarding_router = Router();

onboarding_router.post("/complete-step", onboarding_controller.complete_step)