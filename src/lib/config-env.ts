import dotenv from "dotenv";
dotenv.config();

export const env = {
    finsys_base_api: process.env.FINSYS_BASE_API!,
    JWT_SECRET: process.env.JWT_SECRET!,
    MF_LATEST_URL: process.env.MF_LATEST_URL!,
    KYC_BASE_URL: process.env.KYC_BASE_URL!,
    ARN: process.env.ARN!,
    FINNSYS_USERNAME: process.env.FINNSYS_USERNAME!,
    FINNSYS_PASSWORD: process.env.FINNSYS_PASSWORD!,
};
