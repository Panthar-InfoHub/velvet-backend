import { Router } from "express";
import { user_goal_controller } from "../controller/user.goal.controller.js";

export const user_goal_router = Router();

user_goal_router.post("/", user_goal_controller.create);
user_goal_router.patch("/:goal_id", user_goal_controller.update);