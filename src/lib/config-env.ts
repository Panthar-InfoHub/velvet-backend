import dotenv from "dotenv";
dotenv.config();

export const env = {
    finsys_base_api: process.env.FINSYS_BASE_API!,
    JWT_SECRET: process.env.JWT_SECRET!,
    MF_LATEST_URL: process.env.MF_LATEST_URL!,
};
