import { Router } from "express";
import { user_loan_controller } from "../../controller/user.loan.controller.js";

export const user_loan_router = Router();

user_loan_router.post("/", user_loan_controller.create);
user_loan_router.patch("/:loan_id", user_loan_controller.update);
user_loan_router.get("/", user_loan_controller.get_all);
user_loan_router.get("/:loan_id", user_loan_controller.get_loan_by_id);
user_loan_router.delete("/:loan_id", user_loan_controller.delete);