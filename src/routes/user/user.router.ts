import { Router } from "express";
import { login_require } from "../../middleware/session.middleware.js";
import { user_controller } from "../../controller/user.controller.js";

export const user_router = Router();

user_router.get("/", login_require, user_controller.get_user)