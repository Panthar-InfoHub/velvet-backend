import { Router } from "express";
import { job_controller } from "../controller/job.controller.js";

export const job_router = Router();

job_router.post("/mf-daily", job_controller.daily_mf_job);