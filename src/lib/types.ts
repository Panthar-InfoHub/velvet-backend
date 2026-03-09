import { UserGetPayload } from "../prisma/generated/prisma/models.js";

export interface DeviceDetails {
    dtyp: "A" | "I";
    dver: string;
    dbn: string;
    did: string;
}

export interface AuthResponse {
    code: number;
    results?: any;
}

export type UserWithAllData = UserGetPayload<{
    include: {
        user_finance: true
        user_assets: true
        user_insurance: true
        user_loan: true
        user_goals: true
    }
}>