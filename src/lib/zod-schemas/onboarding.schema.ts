import { z } from "zod";
import { user_loan_zod_schema } from "./loan.schema.js";

export const onboarding_finance_schema = z.object({
    annual_income: z.number().min(0),
    expense_house: z.number().min(0),
    expense_food: z.number().min(0),
    expense_transportation: z.number().min(0),
    expense_others: z.number().min(0),
});

export const onboarding_assets_schema = z.object({
    mutual_funds: z.number().min(0),
    stocks: z.number().min(0),
    fd: z.number().min(0),
    real_estate: z.number().min(0),
    gold: z.number().min(0),
    cash_saving: z.number().min(0),
});

export const onboarding_insurance_schema = z.object({
    life_insurance: z.number().min(0),
    health_insurance: z.number().min(0),
});

export const onboarding_loans_schema = z.array(user_loan_zod_schema).superRefine((loans, ctx) => {
    const loan_types = new Set<string>();

    for (let i = 0; i < loans.length; i++) {
        const loan_type = loans[i].loan_type;
        if (loan_types.has(loan_type)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Duplicate loan_type found: ${loan_type}`,
                path: [i, "loan_type"],
            });
        }
        loan_types.add(loan_type);
    }
});
