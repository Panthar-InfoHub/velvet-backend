import { z } from "zod";
import { MfPlanType, MfTransactionState } from "../../prisma/generated/prisma/enums.js";

export const get_mf_transactions_query_schema = z.object({
    plan_type: z.nativeEnum(MfPlanType).optional(),
    systematic: z.preprocess((val) => {
        if (typeof val === "string") {
            if (val.toLowerCase() === "true") return true;
            if (val.toLowerCase() === "false") return false;
        }
        return val;
    }, z.boolean().optional()),
    state: z.preprocess((val) => {
        if (typeof val === "string" && val.trim()) {
            return val.trim().toUpperCase();
        }
        return undefined;
    }, z.nativeEnum(MfTransactionState).optional()),
    page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1).default(1)),
    limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().int().min(1).max(100).default(20)),
});

export type GetMfTransactionsQuery = z.infer<typeof get_mf_transactions_query_schema>;
