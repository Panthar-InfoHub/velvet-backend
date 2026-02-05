import { z } from "zod";

export const user_loan_zod_schema = z.object({
    loan_type: z.string().min(1),
    loan_name: z.string().optional(),
    outstanding_amount: z.number().min(0),
    monthly_emi: z.number().min(0),
    tenure_months: z.number().int().min(1),
});

export type UserLoanInput = z.infer<typeof user_loan_zod_schema>;
