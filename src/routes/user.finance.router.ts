import { Router } from "express";
import { user_finance_controller } from "../controller/user.finance.controller.js";

export const user_finance_router = Router();

user_finance_router.post("/", user_finance_controller.create);
user_finance_router.patch("/", user_finance_controller.update);
user_finance_router.get("/", user_finance_controller.get_user_finance);
user_finance_router.delete("/", user_finance_controller.delete);