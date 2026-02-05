import cors from "cors"
import dotenv from "dotenv"
import express from "express"
import morgan from "morgan"
import logger from "./middleware/logger.js"
import AppError, { errorHandler } from "./middleware/error.middleware.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./prisma/generated/prisma/client.js"
import { connectDB } from "./lib/db.js"
import { user_router } from "./routes/user.router.js"
import { onboarding_router } from "./routes/onboarding.router.js"
import { user_loan_router } from "./routes/user.loan.router.js"
import { user_finance_router } from "./routes/user.finance.router.js"
import { user_assets_router } from "./routes/user.assets.router.js"
import { user_insurance_router } from "./routes/user.insurance.router.js"
import { user_goal_router } from "./routes/user.goal.router.js"
import { auth_router } from "./routes/auth.router.js"


//Configurations
dotenv.config()
const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
export const db = new PrismaClient({ adapter: pool })
const app = express()

//Setting up socket server : later





//Middlewares
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.ENVIRONMENT === "dev") {
    app.use(morgan('combined')); //For logging
}


//Routes

app.use("/api/v1/auth", auth_router)
app.use("/api/v1/user", user_router)
app.use("/api/v1/onboarding", onboarding_router)
app.use("/api/v1/user-assets", user_assets_router)
app.use("/api/v1/user-finance", user_finance_router)
app.use("/api/v1/user-loan", user_loan_router)
app.use("/api/v1/user-insurance", user_insurance_router)
app.use("/api/v1/user-goal", user_goal_router)

//Health check
app.get("/ping", (_req, res) => {
    throw new AppError("Service is running...", 501, "SERVER_RUNNING")
    // res.status(200).send({ message: "server is running....." })
})


//Error middlware
app.use(errorHandler)


const PORT = process.env.PORT || 8080



const server = app.listen(PORT, async () => {
    logger.debug(`Backend server started on PORT ==> ${PORT}`);
    await connectDB()
});

// Graceful shutdown
const shutdown = (signal: any) => {
    logger.warn(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
    });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);