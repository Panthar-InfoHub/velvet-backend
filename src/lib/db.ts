import AppError from "../middleware/error.middleware.js";
import logger from "../middleware/logger.js";
import { db } from "../server.js";

export const connectDB = async () => {
    try {
        await db.$connect();
        logger.debug("Database connected....");
    } catch (error) {
        logger.error("Error while connecting to database ==> ", error);
        throw new AppError("Database connection failed", 500);
    }
};
