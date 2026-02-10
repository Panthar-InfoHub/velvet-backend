import { ErrorRequestHandler } from "express";
import logger from "./logger.js";


class AppError extends Error {
    public readonly statusCode: number;
    public readonly errorType: string;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode = 500,
        errorType = "ApplicationError",
        isOperational = true
    ) {
        super(message);

        this.statusCode = statusCode;
        this.errorType = errorType;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;

export const errorHandler: ErrorRequestHandler = (
    err,
    _req,
    res,
    _next
) => {
    let error = err;

    if (!(error instanceof AppError)) {
        // Mongo duplicate key
        if (error.name === "MongoServerError" && error.code === 11000) {
            error = new AppError(
                `Duplicate field value entered: ${Object.keys(error.keyValue || {})}`,
                409,
                "DuplicateKeyError"
            );
        }

        // Mongo error code 27
        else if (error.name === "MongoServerError" && error.code === 27) {
            error = new AppError(
                `Product not found ==> ${error.errorResponse?.errmsg}`,
                409,
                "MongoError"
            );
        }

        // Mongoose validation error
        else if (error.name === "ValidationError") {
            const message = Object.values(error.errors || {})
                .map((val: any) => `${val.path}: ${val.message}`)
                .join(", ");

            error = new AppError(message, 400, "ValidationError");
        }

        // CastError (invalid ObjectId)
        else if (error.name === "CastError") {
            error = new AppError(
                `Invalid ${error.path}: ${error.value}`,
                400,
                "CastError"
            );
        }

        // JWT errors
        else if (error.name === "JsonWebTokenError") {
            error = new AppError(
                "Invalid token. Please log in again!",
                401,
                "TokenError"
            );
        }

        else if (error.name === "TokenExpiredError") {
            error = new AppError(
                "Your token has expired! Please log in again.",
                401,
                "TokenExpiredError"
            );
        }

        // Unknown / programming error
        else {
            error = new AppError(
                "Internal Server Error",
                500,
                "ServerError",
                false
            );
        }
    }

    if (!error.isOperational) {
        // logger.error("UNEXPECTED ERROR:", err);
    }

    // 3. Unified response
    res.status(error.statusCode).json({
        success: false,
        error: {
            type: error.errorType,
            message: error.message,
            ...(process.env.NODE_ENV === "development" && {
                stack: error.stack
            })
        }
    });
};
