import { Prisma } from "../prisma/generated/prisma/client.js";
import {
    FIRE_CONSTANTS,
    ComputedMetrics,
    FireCalculatorResult,
    YearlyProjection,
    NormalizedGoal,
    TrackedLoan,
    FireReportCoreResponse,
} from "../lib/fire-report.types.js";
import { UserWithAllData } from "../lib/types.js";
import { user_service } from "./user.service.js";
import logger from "../middleware/logger.js";
import AppError from "../middleware/error.middleware.js";

class FireReportServiceClass {

    async get_fire_report(user_id: string): Promise<FireReportCoreResponse> {
        const data = await user_service.get_all_user_data(user_id, {
            user_finance: true,
            user_assets: true,
            user_insurance: true,
            user_loan: true,
            user_goals: true,
        });

        if (!data) {
            logger.error(`No user data found for user_id: ${user_id}`);
            throw new AppError("User data not found", 404, "USER_DATA_NOT_FOUND");
        }

        const computed_metrics = this.compute_metrics(data);
        const fire_calculator = this.compute_fire_calculator(data, computed_metrics);
        const thirty_year_projection = this.compute_projection(data, computed_metrics, fire_calculator);

        return {
            user_profile: {
                name: data.full_name,
                age: this.extract_age(data.dob),
                city: data.city,
                retirement_age: FIRE_CONSTANTS.retirement_age,
            },
            computed_metrics,
            fire_calculator,
            thirty_year_projection,
        };
    }

    // ─── Compute Metrics ───────────────────────────────────────
    private compute_metrics(data: UserWithAllData): ComputedMetrics {
        const finance = data.user_finance;
        const assets = data.user_assets;
        const loans = data.user_loan ?? [];

        // User assets
        const mutual_funds = this.to_num(assets?.mutual_funds);
        const stocks = this.to_num(assets?.stocks);
        const fd = this.to_num(assets?.fd);
        const real_estate = this.to_num(assets?.real_estate);
        const gold = this.to_num(assets?.gold);
        const cash_saving = this.to_num(assets?.cash_saving);

        // User finance
        const annual_income = this.to_num(finance?.annual_income);
        const expense_house = this.to_num(finance?.expense_house);
        const expense_food = this.to_num(finance?.expense_food);
        const expense_transportation = this.to_num(finance?.expense_transportation);
        const expense_others = this.to_num(finance?.expense_others);

        const total_assets = mutual_funds + stocks + fd + real_estate + gold + cash_saving;
        const liquid_assets = mutual_funds + stocks + fd + cash_saving;
        const illiquid_assets = real_estate + gold;

        const total_liabilities = loans.reduce((sum, l) => sum + this.to_num(l.outstanding_amount), 0);
        const total_monthly_emi = loans.reduce((sum, l) => sum + this.to_num(l.monthly_emi), 0);

        const net_worth = total_assets - total_liabilities;
        const monthly_income = annual_income / 12;
        const total_annual_expenses = expense_house + expense_food + expense_transportation + expense_others;
        const annual_savings = annual_income - total_annual_expenses - (total_monthly_emi * 12);
        const savings_rate = annual_income === 0 ? 0 : (annual_savings / annual_income) * 100;
        const monthly_available_surplus = monthly_income - (total_annual_expenses / 12) - total_monthly_emi;
        const debt_to_income_ratio = monthly_income === 0 ? 0 : (total_monthly_emi / monthly_income) * 100;

        return {
            total_assets,
            total_liabilities,
            net_worth,
            monthly_income,
            total_annual_expenses,
            annual_savings,
            savings_rate,
            monthly_available_surplus,
            liquid_assets,
            illiquid_assets,
            total_monthly_emi,
            debt_to_income_ratio,
        };
    }

    private compute_fire_calculator(data: UserWithAllData, metrics: ComputedMetrics): FireCalculatorResult {
        const current_age = this.extract_age(data.dob);
        const fire_number = metrics.total_annual_expenses * FIRE_CONSTANTS.fire_factor;
        const remaining = fire_number - metrics.net_worth;
        const real_return = (1 + FIRE_CONSTANTS.expected_returns) / (1 + FIRE_CONSTANTS.expense_inflation) - 1;

        let years_to_fire = 0;
        let monthly_investment_required = 0;

        if (remaining <= 0) {
            years_to_fire = 0;
            monthly_investment_required = 0;
        } else if (metrics.annual_savings <= 0) {
            years_to_fire = 99;
            monthly_investment_required = 0;
        } else {
            // Solve: FV = PV·(1+r)^n + PMT·[(1+r)^n - 1]/r  →  numerically via log
            const r = real_return;
            const pmt = metrics.annual_savings;
            // Approximate n via natural log formula (continuous savings model)
            years_to_fire = Math.log(1 + (remaining * r) / pmt) / Math.log(1 + r);
            years_to_fire = Math.max(0, years_to_fire);

            // Monthly PMT formula: PMT = FV · (r/12) / [(1+r/12)^(n*12) - 1]
            const r_monthly = real_return / 12;
            const n_months = years_to_fire * 12;
            const denom = Math.pow(1 + r_monthly, n_months) - 1;
            monthly_investment_required = denom < 1e-9
                ? remaining                          // lump sum fallback
                : (remaining * r_monthly) / denom;
            monthly_investment_required = Math.max(0, monthly_investment_required);
        }

        return {
            current_age,
            retirement_age: FIRE_CONSTANTS.retirement_age,
            annual_expenses: metrics.total_annual_expenses,
            current_net_worth: metrics.net_worth,
            expected_returns: FIRE_CONSTANTS.expected_returns,
            inflation_rate: FIRE_CONSTANTS.expense_inflation,
            fire_number,
            years_to_fire,
            monthly_investment_required,
        };
    }

    // ─── 30Year Projection ───────────────────────────────────────
    private compute_projection(data: UserWithAllData, metrics: ComputedMetrics, calculator: FireCalculatorResult,): YearlyProjection[] {
        const current_year = new Date().getFullYear();
        const user_age = calculator.current_age;
        const fire_number = calculator.fire_number;

        const goals = this.normalize_goals(data.user_goals ?? [], current_year);
        // deep-copy loans so tenure mutation doesn't affect the original array
        const loans = this.normalize_loans(data.user_loan ?? []).map(l => ({ ...l }));

        let capital = metrics.net_worth;
        let annual_income = this.to_num(data.user_finance?.annual_income);
        let annual_expenses = metrics.total_annual_expenses;
        let cumulative_goal_outflow = 0;

        const projections: YearlyProjection[] = [];

        for (let i = 0; i < 30; i++) {
            const year = current_year + i;
            const age = user_age + i;
            const is_retired = age >= FIRE_CONSTANTS.retirement_age;

            // Income 
            if (is_retired) {
                annual_income = capital * FIRE_CONSTANTS.withdrawal_rate;
            }

            //  Loan EMIs 
            const total_loan_emi = loans.reduce((sum, loan) => {
                if (loan.remaining_months <= 0) return sum;
                return sum + loan.monthly_emi * 12;
            }, 0);

            //  Goal projections
            let goal_outflow = 0;
            for (const g of goals) {
                if (g.target_year === year) {
                    const future_value = g.current_cost * Math.pow(1 + g.inflation_rate, g.years_left);
                    goal_outflow += future_value;
                }
            }
            cumulative_goal_outflow += goal_outflow;

            //  Net savings + capital growth 
            const net_savings = annual_income - annual_expenses - total_loan_emi - goal_outflow;
            const growth_rate = is_retired
                ? FIRE_CONSTANTS.post_retirement_return
                : FIRE_CONSTANTS.expected_returns;
            const ending_capital = Math.max(0, capital * (1 + growth_rate) + net_savings);

            //  Auxiliary metrics (snapshot from initial; same as old frontend) 
            const fire_progress = fire_number === 0 ? 0 : Math.min(100, (capital / fire_number) * 100);
            const monthly_expenses = annual_expenses / 12;
            const emergency_fund_months = monthly_expenses === 0
                ? 0
                : metrics.liquid_assets / monthly_expenses;

            projections.push({
                year,
                age,
                capital: Math.round(capital),
                annual_income: Math.round(annual_income),
                annual_expenses: Math.round(annual_expenses),
                net_savings: Math.round(net_savings),
                total_loan_emi: Math.round(total_loan_emi),
                goal_outflow: Math.round(goal_outflow),
                is_retired,
                fire_progress: parseFloat(fire_progress.toFixed(2)),
                liquid_assets: Math.round(metrics.liquid_assets),
                illiquid_assets: Math.round(metrics.illiquid_assets),
                emergency_fund_months: parseFloat(emergency_fund_months.toFixed(1)),
                cumulative_goal_outflow: Math.round(cumulative_goal_outflow),
            });

            // ── Advance state for next iteration ────────────────────────────
            capital = ending_capital;
            if (!is_retired) annual_income *= (1 + FIRE_CONSTANTS.income_growth);
            annual_expenses *= (1 + FIRE_CONSTANTS.expense_inflation);

            for (const loan of loans) {
                loan.remaining_months = Math.max(0, loan.remaining_months - 12);
            }
        }

        return projections;
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private to_num(val: Prisma.Decimal | null | undefined): number {
        return val?.toNumber() ?? 0;
    }

    private extract_age(dob: Date | null): number {
        if (!dob) return FIRE_CONSTANTS.default_age;
        const age = Math.floor((Date.now() - new Date(dob).getTime()) / 31_557_600_000);
        return Math.max(0, age);
    }

    /** Map DB loan rows into TrackedLoan (mutable tenure) */
    private normalize_loans(loans: NonNullable<UserWithAllData["user_loan"]>): TrackedLoan[] {
        const reduction_map: Record<string, number> = {
            home_loan: 0.92,
            vehicle_loan: 0.85,
            personal_loan: 0.90,
            credit_card: 1.00,
        };
        return loans.map(l => ({
            loan_type: l.loan_type,
            monthly_emi: this.to_num(l.monthly_emi),
            remaining_months: l.tenure_months ?? 0,
            annual_reduction: reduction_map[l.loan_type] ?? 0.90,
        }));
    }

    /** Map DB goal rows into NormalizedGoal; skips goals with no years_left */
    private normalize_goals(
        goals: NonNullable<UserWithAllData["user_goals"]>,
        current_year: number,
    ): NormalizedGoal[] {
        const label_map: Record<number, string> = {
            1: "Child Education",
            2: "Child Marriage",
            3: "Retirement Fund",
            4: "Item Goal",
        };
        return goals
            .filter(g => g.years_left != null && g.years_left > 0)
            .map(g => ({
                name: g.goal_name ?? label_map[g.goal_type_id] ?? "Financial Goal",
                target_year: current_year + g.years_left!,
                current_cost: this.to_num(g.current_goal_cost),
                years_left: g.years_left!,
                inflation_rate: (g.inflation_rate ?? 0) / 100,
            }));
    }
}

export const fire_report_service = new FireReportServiceClass();