import { Prisma } from "../prisma/generated/prisma/client.js";
import {
    FIRE_CONSTANTS,
    ComputedMetrics,
    ProjectionAssets,
    ProjectionRow,
    NormalizedGoalWithSIP,
    TrackedLoan,
    FireReportCoreResponse,
} from "../lib/fire-report.types.js";
import { UserWithAllData } from "../lib/types.js";
import { user_service } from "./user.service.js";
import logger from "../middleware/logger.js";
import AppError from "../middleware/error.middleware.js";

class FireReportServiceClass {

    async get_fire_report(user_id: string, projection_years: number = FIRE_CONSTANTS.default_projection_years): Promise<FireReportCoreResponse> {
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

        const monthly_expenses_total = computed_metrics.total_annual_expenses / 12;

        const goals = this.normalize_goals_with_sip(
            data.user_goals ?? [],
            data.dob,
            monthly_expenses_total,
        );

        const projection = this.compute_projection(data, computed_metrics, goals, projection_years);

        return {
            user_profile: {
                name: data.full_name,
                age: this.extract_age(data.dob),
                city: data.city,
            },
            computed_metrics,
            goals,
            projection,
        };
    }

    // Compute Metrics 
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

    //  Projection ( per-asset growth, SIP goals, partial EMI — dual-track: emi_include / emi_exclude)
    private compute_projection(data: UserWithAllData, metrics: ComputedMetrics, goals: NormalizedGoalWithSIP[], projection_years: number): ProjectionRow[] {
        const current_year = new Date().getFullYear();
        const loans = this.normalize_loans(data.user_loan ?? []);
        const g = FIRE_CONSTANTS.asset_growth;

        const initial_assets: ProjectionAssets = {
            mutual_funds: this.to_num(data.user_assets?.mutual_funds),
            stocks: this.to_num(data.user_assets?.stocks),
            fd: this.to_num(data.user_assets?.fd),
            real_estate: this.to_num(data.user_assets?.real_estate),
            gold: this.to_num(data.user_assets?.gold),
            cash_saving: this.to_num(data.user_assets?.cash_saving),
            nps: 0,
            ppf_epf: 0,
        };

        // Two independent asset tracks — only cash_saving diverges via different reinvestment each year
        let ya_inc: ProjectionAssets = { ...initial_assets };
        let ya_exc: ProjectionAssets = { ...initial_assets };

        const annual_income_base = this.to_num(data.user_finance?.annual_income);
        const annual_expenses_base = metrics.total_annual_expenses;
        const proj: ProjectionRow[] = [];

        for (let i = 0; i < projection_years; i++) {
            // 1. Apply per-asset growth to both tracks
            //    Non-cash assets grow identically; cash_saving diverges from prior reinvestment
            ya_inc = {
                mutual_funds: ya_inc.mutual_funds * (1 + g.mutual_funds),
                stocks: ya_inc.stocks * (1 + g.stocks),
                fd: ya_inc.fd * (1 + g.fd),
                real_estate: ya_inc.real_estate * (1 + g.real_estate),
                gold: ya_inc.gold * (1 + g.gold),
                cash_saving: ya_inc.cash_saving * (1 + g.cash_saving),
                nps: ya_inc.nps * (1 + g.nps),
                ppf_epf: ya_inc.ppf_epf * (1 + g.ppf_epf),
            };
            ya_exc = {
                mutual_funds: ya_exc.mutual_funds * (1 + g.mutual_funds),
                stocks: ya_exc.stocks * (1 + g.stocks),
                fd: ya_exc.fd * (1 + g.fd),
                real_estate: ya_exc.real_estate * (1 + g.real_estate),
                gold: ya_exc.gold * (1 + g.gold),
                cash_saving: ya_exc.cash_saving * (1 + g.cash_saving),
                nps: ya_exc.nps * (1 + g.nps),
                ppf_epf: ya_exc.ppf_epf * (1 + g.ppf_epf),
            };

            // 2. Portfolio totals after growth
            const sum_assets = (ya: ProjectionAssets) =>
                ya.mutual_funds + ya.stocks + ya.fd + ya.gold +
                ya.cash_saving + ya.nps + ya.ppf_epf + ya.real_estate;
            const portfolio_inc = sum_assets(ya_inc);
            const portfolio_exc = sum_assets(ya_exc);

            // 3. Income and base expenses (same for both tracks)
            const income = annual_income_base * Math.pow(1 + FIRE_CONSTANTS.income_growth, i);
            const expenses_raw = annual_expenses_base * Math.pow(1 + FIRE_CONSTANTS.expense_growth, i);

            // 4. EMI — partial-year aware
            let yearly_emi = 0;
            const months_elapsed = i * 12;
            for (const loan of loans) {
                const months_remaining = loan.tenure_months - months_elapsed;
                const months_paid = Math.max(0, Math.min(12, months_remaining));
                if (months_paid > 0) yearly_emi += loan.monthly_emi * months_paid;
            }

            // 5. Total expenses — the only hard branch between the two tracks
            const total_expenses_inc = expenses_raw + yearly_emi;
            const total_expenses_exc = expenses_raw;

            // 6. Goal SIP commitment (same for both tracks — not EMI-dependent)
            const goal_commitment_annual = goals.reduce((sum, goal) =>
                (current_year + i) <= goal.target_year
                    ? sum + goal.required_monthly_sip * 12
                    : sum
                , 0);

            // 7. Goal payouts (same for both tracks)
            const goal_hits: { label: string; amount: number }[] = [];
            const goals_payout = goals.reduce((sum, goal) => {
                const fv = this.calculate_goal_future_value(goal, current_year, current_year + i);
                if (fv && fv > 0) {
                    goal_hits.push({ label: `${goal.name} (${goal.target_year})`, amount: Math.round(fv) });
                    return sum + fv;
                }
                return sum;
            }, 0);

            // 8. Savings per track
            const savings_inc = income - total_expenses_inc - goal_commitment_annual;
            const savings_exc = income - total_expenses_exc - goal_commitment_annual;

            // 9. Portfolio value per track
            const portfolio_value_inc = portfolio_inc + savings_inc - goals_payout;
            const portfolio_value_exc = portfolio_exc + savings_exc - goals_payout;

            // 10. Reinvest into each track's cash_saving independently
            ya_inc.cash_saving += Math.max(0, savings_inc - goals_payout);
            ya_exc.cash_saving += Math.max(0, savings_exc - goals_payout);

            // 11. FIRE number and percentage per track
            const fire_number_inc = (total_expenses_inc + goal_commitment_annual) * FIRE_CONSTANTS.fire_factor;
            const fire_number_exc = (total_expenses_exc + goal_commitment_annual) * FIRE_CONSTANTS.fire_factor;
            const fire_percentage_inc = fire_number_inc > 0 ? (portfolio_value_inc * 100) / fire_number_inc : 0;
            const fire_percentage_exc = fire_number_exc > 0 ? (portfolio_value_exc * 100) / fire_number_exc : 0;

            proj.push({
                year: current_year + i,
                income: Math.round(income),
                goal_commitment_annual: Math.round(goal_commitment_annual),
                goals_payout: Math.round(goals_payout),
                goal_hits,
                total_expenses: { emi_include: Math.round(total_expenses_inc), emi_exclude: Math.round(total_expenses_exc) },
                savings: { emi_include: Math.round(savings_inc), emi_exclude: Math.round(savings_exc) },
                portfolio_value: { emi_include: Math.round(portfolio_value_inc), emi_exclude: Math.round(portfolio_value_exc) },
                fire_number: { emi_include: Math.round(fire_number_inc), emi_exclude: Math.round(fire_number_exc) },
                fire_percentage: { emi_include: parseFloat(fire_percentage_inc.toFixed(2)), emi_exclude: parseFloat(fire_percentage_exc.toFixed(2)) },
            });
        }

        return proj;
    }

    //  Goal SIP Calculator 
    private calculate_goal_sip(
        goal: NormalizedGoalWithSIP,
        dob: Date | null,
        monthly_expenses_total: number,
    ): number {
        const current_year = new Date().getFullYear();

        // ── Retirement (goal_type_id === 3) ──────────────────────────────────
        if (goal.goal_type_id === 3) {
            if (!dob) return 0;

            const birth_year = new Date(dob).getFullYear();
            const present_age = current_year - birth_year;
            // target_year is already birth_year + retirement_age (set in normalize)
            const retirement_age = goal.target_year - birth_year;
            const years_to_retirement = retirement_age - present_age;
            if (years_to_retirement <= 0) return 0;

            const life_expectancy = goal.life_expectancy ?? 80;
            const years_post_retirement = life_expectancy - retirement_age;
            if (years_post_retirement <= 0) return 0;

            const monthly_exp = goal.current_monthly_exp ?? monthly_expenses_total;
            if (monthly_exp <= 0) return 0;

            const r = FIRE_CONSTANTS.retirement_return;    // 0.10
            const inflation = FIRE_CONSTANTS.retirement_inflation; // 0.06

            const current_annual_expense = monthly_exp * 12;
            const annual_expense_at_retirement =
                current_annual_expense * Math.pow(1 + inflation, years_to_retirement);

            // Growing annuity PV for corpus needed at retirement
            let retirement_corpus = 0;
            if (Math.abs(r - inflation) < 1e-9) {
                const pv_annuity = annual_expense_at_retirement * (years_post_retirement / (1 + r));
                retirement_corpus = pv_annuity * (1 + r);
            } else {
                const growth_factor = (1 + inflation) / (1 + r);
                const pv_growing_annuity =
                    annual_expense_at_retirement *
                    (1 - Math.pow(growth_factor, years_post_retirement)) /
                    (r - inflation);
                retirement_corpus = pv_growing_annuity * (1 + r);
            }

            const months_to_retirement = years_to_retirement * 12;
            if (months_to_retirement <= 0) return 0;

            // Monthly SIP PMT (annuity-due) to accumulate retirement_corpus
            const rm = Math.pow(1 + r, 1 / 12) - 1;
            const fv_factor = Math.pow(1 + rm, months_to_retirement) - 1;
            if (fv_factor <= 0 || rm <= 0) return 0;

            const monthly_sip = (retirement_corpus * rm) / (fv_factor * (1 + rm));
            const value = Math.round(monthly_sip);
            return isFinite(value) ? value : 0;
        }

        // ── Non-retirement (types 1, 2, 4) ───────────────────────────────────
        // Formula: numerator / (11 × 12 × denominator) from FireReport.tsx
        const years_to_goal = goal.target_year - current_year;
        const denominator = Math.pow(1 + FIRE_CONSTANTS.goal_sip_return, years_to_goal) - 1; // (1.1^n - 1)
        if (denominator === 0) return 0;
        const numerator = goal.target_amount * Math.pow(1 + FIRE_CONSTANTS.goal_fv_growth, years_to_goal); // target × 1.08^n
        const value = numerator / (11 * 12 * denominator);
        return isFinite(value) ? Math.round(value) : 0;
    }

    //  Goal Future Value 
    // Exact port of calculateGoalFutureValue() from FireReport.tsx
    private calculate_goal_future_value(
        goal: NormalizedGoalWithSIP,
        current_year: number,
        year: number,
    ): number | null {
        // Retirement goals have no lump-sum payout — covered by SIP
        if (goal.goal_type_id === 3) return null;
        if (year !== goal.target_year) return null;

        const years_to_goal = goal.target_year - current_year;
        if (years_to_goal <= 0) return goal.target_amount;
        return goal.target_amount * Math.pow(1 + FIRE_CONSTANTS.goal_fv_growth, years_to_goal);
    }

    // Helpers 

    private to_num(val: Prisma.Decimal | null | undefined): number {
        return val?.toNumber() ?? 0;
    }

    private extract_age(dob: Date | null): number {
        if (!dob) return FIRE_CONSTANTS.default_age;
        const age = Math.floor((Date.now() - new Date(dob).getTime()) / 31_557_600_000);
        return Math.max(0, age);
    }

    /** Map DB loan rows → TrackedLoan; tenure_months kept as original (not mutated in loop) */
    private normalize_loans(loans: NonNullable<UserWithAllData["user_loan"]>): TrackedLoan[] {
        return loans.map(l => ({
            loan_type: l.loan_type,
            monthly_emi: this.to_num(l.monthly_emi),
            tenure_months: l.tenure_months ?? 0,
        }));
    }

    /** Map DB goal rows → NormalizedGoalWithSIP with pre-computed required_monthly_sip */
    private normalize_goals_with_sip(
        goals: NonNullable<UserWithAllData["user_goals"]>,
        dob: Date | null,
        monthly_expenses_total: number,
    ): NormalizedGoalWithSIP[] {
        const current_year = new Date().getFullYear();
        const birth_year = dob ? new Date(dob).getFullYear() : null;

        const label_map: Record<number, string> = {
            1: "Child Education",
            2: "Child Marriage",
            3: "Retirement",
            4: "Wealth Goal",
        };

        const normalized: NormalizedGoalWithSIP[] = [];

        for (const g of goals) {
            // ── Type 3: Retirement ─────
            if (g.goal_type_id === 3) {
                // Need dob + retirement_age to derive target_year
                if (birth_year === null || g.retirement_age == null) continue;
                const target_year = birth_year + g.retirement_age;
                if (target_year <= current_year) continue;

                const entry: NormalizedGoalWithSIP = {
                    id: g.id,
                    name: "Retirement Fund",
                    category: "Retirement",
                    target_year,
                    target_amount: 0,
                    life_expectancy: g.life_expectancy ?? null,
                    current_monthly_exp: g.current_monthly_expense
                        ? this.to_num(g.current_monthly_expense)
                        : null,
                    required_monthly_sip: 0,
                    goal_type_id: 3,
                };
                entry.required_monthly_sip = this.calculate_goal_sip(entry, dob, monthly_expenses_total);
                normalized.push(entry);
                continue;
            }

            // ── Types 1, 2, 4: Standard goals ────────────────────────────────
            if (g.years_left == null || g.years_left <= 0) continue;
            if (g.current_goal_cost == null) continue;

            const target_year = current_year + g.years_left;
            const name =
                g.goal_type_id === 4
                    ? (g.goal_item_name ?? g.goal_name ?? label_map[4])
                    : label_map[g.goal_type_id] ?? "Financial Goal";

            const entry: NormalizedGoalWithSIP = {
                id: g.id,
                name,
                category: label_map[g.goal_type_id] ?? "Goal",
                target_year,
                target_amount: this.to_num(g.current_goal_cost),
                life_expectancy: null,
                current_monthly_exp: null,
                required_monthly_sip: 0,
                goal_type_id: g.goal_type_id,
            };
            entry.required_monthly_sip = this.calculate_goal_sip(entry, dob, monthly_expenses_total);
            normalized.push(entry);
        }

        return normalized;
    }
}

export const fire_report_service = new FireReportServiceClass();