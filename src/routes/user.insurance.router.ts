import { Router } from "express";
import { user_insurance_controller } from "../controller/user.insurance.controller.js";

export const user_insurance_router = Router();

user_insurance_router.post("/", user_insurance_controller.create);
user_insurance_router.patch("/", user_insurance_controller.update);
user_insurance_router.get("/", user_insurance_controller.get);
// user_insurance_router.delete("/", user_insurance_controller.delete);