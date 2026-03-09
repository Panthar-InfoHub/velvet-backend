// ─── FIRE Constants ───────────────────────────────────────────────────────────

export const FIRE_CONSTANTS = {
    income_growth: 0.08,             // 8% annual income growth
    expense_inflation: 0.06,         // 6% expense inflation
    expected_returns: 0.12,          // 12% weighted portfolio return
    post_retirement_return: 0.08,    // 8% return post retirement
    withdrawal_rate: 0.04,           // 4% safe withdrawal rate (FIRE rule)
    fire_factor: 25,                 // 25x annual expenses = FIRE number
    retirement_age: 60,              // hardcoded default, not sourced from DB
    default_age: 30,                 // fallback when dob is null
} as const;

// ─── Engine 1 — Computed Metrics ─────────────────────────────────────────────

export interface ComputedMetrics {
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    monthly_income: number;
    total_annual_expenses: number;
    annual_savings: number;
    savings_rate: number;
    monthly_available_surplus: number;
    liquid_assets: number;
    illiquid_assets: number;
    total_monthly_emi: number;
    debt_to_income_ratio: number;
}

// ─── Engine 2 — FIRE Calculator ──────────────────────────────────────────────

export interface FireCalculatorResult {
    current_age: number;
    retirement_age: number;
    annual_expenses: number;
    current_net_worth: number;
    expected_returns: number;
    inflation_rate: number;
    fire_number: number;
    years_to_fire: number;
    monthly_investment_required: number;
}

// ─── Engine 3 — 30-Year Projection ───────────────────────────────────────────

export interface YearlyProjection {
    year: number;
    age: number;
    capital: number;
    annual_income: number;
    annual_expenses: number;
    net_savings: number;
    total_loan_emi: number;
    goal_outflow: number;
    is_retired: boolean;
    fire_progress: number;         // percentage: (capital / fireNumber) * 100
    liquid_assets: number;
    illiquid_assets: number;
    emergency_fund_months: number; // liquid_assets / monthly_expenses
    cumulative_goal_outflow: number;
}

// ─── Internal Pre-processing Types ───────────────────────────────────────────

export interface NormalizedGoal {
    name: string;
    target_year: number;
    current_cost: number;
    years_left: number;
    inflation_rate: number;        // already as decimal (e.g. 0.06)
}

export interface TrackedLoan {
    loan_type: string;
    monthly_emi: number;
    remaining_months: number;
    annual_reduction: number;      // principal reduction factor per year
}

// ─── Combined Response ────────────────────────────────────────────────────────

export interface UserProfileSnapshot {
    name: string | null;
    age: number;
    city: string | null;
    retirement_age: number;
}

export interface FireReportCoreResponse {
    user_profile: UserProfileSnapshot;
    computed_metrics: ComputedMetrics;
    fire_calculator: FireCalculatorResult;
    thirty_year_projection: YearlyProjection[];
}
