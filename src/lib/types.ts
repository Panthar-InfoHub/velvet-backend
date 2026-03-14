import { UserGetPayload } from "../prisma/generated/prisma/models.js";
import { z } from "zod";

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

export const lumpsum_cart_zod_schema = z.object({
    amc_code: z.string().min(1),
    amc_name: z.string().min(1),
    prod_code: z.string().min(1),
    prod_name: z.string().min(1),
    folio: z.string().optional(),
    reinv_flag: z.enum(["N", "Y", "Z"]).optional(),
    txn_amount: z.number().positive(),
    schm_id: z.number().optional(),
});

export type Lumpsum_cart_data = z.infer<typeof lumpsum_cart_zod_schema>