# FIRE Report — Implementation Plan
## Scope: `computedMetrics` · `fireCalculator` · `thirtyYearProjection`

> This plan covers the first 3 computation engines only.  
> Engines 4–6 (Financial Health Score, Risk Assessment, Insurance Requirements) are out of scope for this phase.

---

## Fixes Applied to Analysis (vs previous version)

Two corrections from the analysis document carry into this plan:

1. **Typo fixed**: `UserAssets.mutual_funds` — the old analysis referenced the DB field as `mututal_funds`. The correct field name in the updated schema is `mutual_funds`.

2. **Retirement age is hardcoded 60** — the old analysis incorrectly stated that `retirementAge` comes from `UserGoals.retirement_age` (goal_type_id=3). That field exists for FinSys API integration. For FIRE projection purposes, retirement age is **always 60 by default**. It is a calculation constant, not a user-configurable input in v1.

---

## What We Are Building

Three backend endpoints that return pre-computed financial metrics for a given authenticated user:

```
GET /api/v1/fire-report/metrics     → computedMetrics
GET /api/v1/fire-report/calculator  → fireCalculator
GET /api/v1/fire-report/projection  → thirtyYearProjection (30 rows)
```

Or a single combined endpoint:

```
GET /api/v1/fire-report             → { computedMetrics, fireCalculator, thirtyYearProjection }
```

**Recommendation**: Single endpoint. All 3 engines depend on each other (projection needs metrics, calculator needs metrics). No reason to split.

---

## Data Fetched from DB

All data is fetched in **one parallel batch** per request:

```typescript
const [user, finance, assets, loans, goals] = await Promise.all([
  db.user.findUnique({ where: { id: userId } }),
  db.userFinance.findUnique({ where: { user_id: userId } }),
  db.userAssets.findUnique({ where: { user_id: userId } }),
  db.userLoan.findMany({ where: { user_id: userId } }),
  db.userGoals.findMany({ where: { user_id: userId } }),
]);
```

> Note: `UserInsurance` is NOT fetched at this phase — it's only needed for Engines 4–6.

---

## Engine 1 — `computedMetrics`

### Inputs from DB

| DB Field | Source Model | Maps To |
|---|---|---|
| `annual_income` | `UserFinance` | `annualIncome` |
| `expense_house` | `UserFinance` | part of `totalAnnualExpenses` |
| `expense_food` | `UserFinance` | part of `totalAnnualExpenses` |
| `expense_transportation` | `UserFinance` | part of `totalAnnualExpenses` |
| `expense_others` | `UserFinance` | part of `totalAnnualExpenses` |
| `mutual_funds` | `UserAssets` | part of `totalAssets`, `liquidAssets` |
| `stocks` | `UserAssets` | part of `totalAssets`, `liquidAssets` |
| `fd` | `UserAssets` | part of `totalAssets`, `liquidAssets` |
| `real_estate` | `UserAssets` | part of `totalAssets` (illiquid) |
| `gold` | `UserAssets` | part of `totalAssets` (illiquid) |
| `cash_saving` | `UserAssets` | part of `totalAssets`, `liquidAssets` |
| `outstanding_amount` | `UserLoan[]` | part of `totalLiabilities` |
| `monthly_emi` | `UserLoan[]` | part of `totalMonthlyEMI` |

### All Formulas

```
totalAssets = mutual_funds + stocks + fd + real_estate + gold + cash_saving

totalLiabilities = SUM(outstanding_amount for all UserLoan rows)

netWorth = totalAssets - totalLiabilities

monthlyIncome = annual_income / 12

totalAnnualExpenses = expense_house + expense_food + expense_transportation + expense_others

totalMonthlyEMI = SUM(monthly_emi for all UserLoan rows)

annualSavings = annual_income - totalAnnualExpenses - (totalMonthlyEMI × 12)
  → Can be negative (over-leveraged user)

savingsRate = (annualSavings / annual_income) × 100
  → Guard: if annual_income === 0, savingsRate = 0

monthlyAvailableSurplus = monthlyIncome - (totalAnnualExpenses / 12) - totalMonthlyEMI

liquidAssets = mutual_funds + stocks + fd + cash_saving

illiquidAssets = totalAssets - liquidAssets
  → Equals: real_estate + gold

debtToIncomeRatio = (totalMonthlyEMI / monthlyIncome) × 100
  → Guard: if monthlyIncome === 0, debtToIncomeRatio = 0
```

### Output Shape

```typescript
interface ComputedMetrics {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  totalAnnualExpenses: number;
  annualSavings: number;
  savingsRate: number;
  monthlyAvailableSurplus: number;
  liquidAssets: number;
  illiquidAssets: number;
  totalMonthlyEMI: number;
  debtToIncomeRatio: number;
}
```

### Null-safety rules
- If `UserFinance` not found → all finance fields = 0
- If `UserAssets` not found → all asset fields = 0
- If `UserLoan[]` empty → totalLiabilities = 0, totalMonthlyEMI = 0
- Never throw on missing records — return zeroed metrics

---

## Engine 2 — `fireCalculator`

### Depends on
- `computedMetrics` (Engine 1 output)
- `User.dob` → compute `age`
- `RETIREMENT_AGE = 60` (hardcoded constant)

### Computing Age from DOB

```typescript
function extractAge(dob: Date | null): number {
  if (!dob) return 30; // default
  const today = new Date();
  const age = Math.floor(
    (today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  return Math.max(0, age);
}
```

### All Formulas

```
CONSTANTS:
  expectedReturns = 0.12   (12% weighted average portfolio return)
  inflationRate   = 0.06   (6% general inflation)
  RETIREMENT_AGE  = 60

STEP 1 — FIRE Number (the target)
  fireNumber = totalAnnualExpenses × 25
  → 25 = 1 / 0.04 (the 4% rule)
  → If totalAnnualExpenses = 0 → fireNumber = 0

STEP 2 — Remaining amount to reach FIRE
  remainingAmount = fireNumber - netWorth

STEP 3 — Real return (inflation-adjusted)
  realReturn = (1 + 0.12) / (1 + 0.06) - 1
             = 1.12 / 1.06 - 1
             ≈ 0.05660...  (5.66%)

STEP 4 — Years to FIRE
  IF remainingAmount <= 0:
    yearsToFire = 0          ← already FIRE-ready
  ELSE IF annualSavings <= 0:
    yearsToFire = 99         ← cannot reach FIRE with negative savings
  ELSE:
    monthlyInvestment = annualSavings / 12
    monthlyRate = (1 + realReturn)^(1/12) - 1

    IF monthlyRate > 0:
      yearsToFire = ln(1 + (remainingAmount × monthlyRate / monthlyInvestment))
                   / ln(1 + monthlyRate)
                   / 12
    ELSE:
      yearsToFire = remainingAmount / annualSavings  ← linear fallback

  yearsToFire = max(0, yearsToFire)

STEP 5 — Monthly investment required to hit FIRE in yearsToFire years
  IF remainingAmount <= 0:
    monthlyInvestmentRequired = 0
  ELSE:
    r = realReturn / 12
    n = yearsToFire × 12
    monthlyInvestmentRequired = (remainingAmount × r) / ((1 + r)^n - 1)
    → If (1+r)^n - 1 ≈ 0 (n very small): monthlyInvestmentRequired = remainingAmount
    monthlyInvestmentRequired = max(0, monthlyInvestmentRequired)

STEP 6 — FIRE percentage (current progress)
  firePercentage = (netWorth / fireNumber) × 100
  → Guard: if fireNumber === 0 → firePercentage = 0
```

### Output Shape

```typescript
interface FireCalculatorResult {
  currentAge: number;
  retirementAge: number;       // always 60
  annualExpenses: number;      // = totalAnnualExpenses
  currentNetWorth: number;     // = netWorth
  expectedReturns: number;     // 0.12
  inflationRate: number;       // 0.06
  fireNumber: number;          // totalAnnualExpenses × 25
  firePercentage: number;      // (netWorth / fireNumber) × 100
  yearsToFire: number;
  monthlyInvestmentRequired: number;
}
```

---

## Engine 3 — `thirtyYearProjection`

### Depends on
- `computedMetrics` (Engine 1)
- `fireCalculator` (Engine 2) — for `fireNumber` reference at year 0
- `User.dob` → age
- `UserLoan[]` → per-loan tenure tracking
- `UserGoals[]` → goal outflow years
- `RETIREMENT_AGE = 60`

### Normalized Goal Shape (pre-processing before loop)

```typescript
interface NormalizedGoal {
  name: string;
  todaysCost: number;         // current_goal_cost as number
  targetYear: number;         // currentYear + years_left
  inflationRate: number;      // inflation_rate / 100
}

// Mapping from UserGoals:
goals.map(g => ({
  name: g.goal_name ?? goalTypeLabel(g.goal_type_id),
  todaysCost: Number(g.current_goal_cost ?? 0),
  targetYear: currentYear + (g.years_left ?? 0),
  inflationRate: (g.inflation_rate ?? 0) / 100,
}))

// goalTypeLabel:
// 1 → "Child Education"
// 2 → "Child Marriage"
// 3 → "Retirement Fund"
// 4 → "Item Goal"
// default → "Financial Goal"
```

### Normalized Loan Shape (pre-processing before loop)

```typescript
interface TrackedLoan {
  loanType: string;           // "home_loan" | "vehicle_loan" | "personal_loan" | "credit_card"
  monthlyEmi: number;         // monthly_emi as number
  remainingTenure: number;    // tenure_months (months remaining)
  annualReduction: number;    // principal reduction rate per year
}

// annualReduction by loanType:
// "home_loan"              → 0.92  (8%/year principal paydown)
// "vehicle_loan"           → 0.85  (15%/year)
// "personal_loan"          → 0.90  (10%/year)
// "credit_card"            → 1.00  (revolving — no tenure rundown)
// any other                → 0.90
```

### Simulation Loop (year = 0 to 29)

```
INITIAL STATE:
  currentCapital  = netWorth
  annualIncome    = annual_income (as number)
  annualExpenses  = totalAnnualExpenses
  loans[]         = deep copy of TrackedLoan array
  currentYear     = new Date().getFullYear()   (2026)
  userAge         = extractAge(user.dob)       (default 30)

FOR year = 0 TO 29:

  projectionYear = currentYear + year          (2026, 2027, ... 2055)
  currentAge     = userAge + year
  isRetired      = (currentAge >= 60)

  ── INCOME ──────────────────────────────────────────────────
  IF NOT isRetired:
    annualIncome = annualIncome × 1.08         ← 8% growth
  ELSE:
    annualIncome = currentCapital × 0.04       ← 4% withdrawal
    (In retirement, "income" = what you draw from portfolio)

  ── EXPENSES ────────────────────────────────────────────────
  annualExpenses = annualExpenses × 1.06       ← 6% inflation

  ── EMI ─────────────────────────────────────────────────────
  totalEMI = 0
  FOR each loan in loans[]:
    IF loan.loanType === "credit_card":
      totalEMI += loan.monthlyEmi × 12         ← revolving, never ends
    ELSE IF loan.remainingTenure > 0:
      totalEMI += loan.monthlyEmi × 12
      loan.remainingTenure -= 12               ← count down months
      (when remainingTenure ≤ 0 → EMI drops to 0 next iteration)

  ── GOAL OUTFLOWS ───────────────────────────────────────────
  goalOutflows = 0
  FOR each goal in normalizedGoals[]:
    IF goal.targetYear === projectionYear:
      yearsFromNow  = projectionYear - currentYear
      futureValue   = goal.todaysCost × (1 + goal.inflationRate)^yearsFromNow
      goalOutflows += futureValue

  ── NET SAVINGS ─────────────────────────────────────────────
  netSavings = annualIncome - annualExpenses - totalEMI - goalOutflows
  (can be negative)

  ── PORTFOLIO GROWTH ────────────────────────────────────────
  weightedReturn    = isRetired ? 0.08 : 0.12
  investmentReturns = currentCapital × weightedReturn
  endingCapital     = max(0, currentCapital + netSavings + investmentReturns)

  ── FIRE METRICS THIS YEAR ──────────────────────────────────
  fireNumber     = annualExpenses × 25          ← grows with inflation
  firePercentage = fireNumber > 0 ? (endingCapital / fireNumber) × 100 : 0
  isFinanciallyIndependent = (firePercentage >= 100)

  ── AUXILIARY METRICS ───────────────────────────────────────
  emergencyFundMonths = annualExpenses > 0
    ? (cash_saving / (annualExpenses / 12))
    : 0
  liquidityRatio = annualExpenses > 0
    ? (liquidAssets / (annualExpenses / 12))
    : 0
  debtCoverageRatio = (netSavings > 0 && totalEMI > 0)
    ? netSavings / totalEMI
    : 0

  ── PUSH ROW ────────────────────────────────────────────────
  projections.push({
    year:                    projectionYear,
    age:                     currentAge,
    income:                  annualIncome,
    expenses:                annualExpenses,
    emiOutflow:              totalEMI,
    goalOutflows:            goalOutflows,
    netSavings:              netSavings,
    beginningCapital:        currentCapital,
    investmentReturns:       investmentReturns,
    endingCapital:           endingCapital,
    fireNumber:              fireNumber,
    firePercentage:          firePercentage,
    isFinanciallyIndependent: isFinanciallyIndependent,
    isRetired:               isRetired,
    pensionIncome:           isRetired ? annualIncome : 0,
    liquidityRatio:          liquidityRatio,
    debtCoverageRatio:       debtCoverageRatio,
    emergencyFundMonths:     emergencyFundMonths,
  });

  currentCapital = endingCapital                ← carry forward

RETURN projections  (30 rows)
```

### Output Shape — Single Row

```typescript
interface YearlyProjection {
  year: number;
  age: number;
  income: number;
  expenses: number;
  emiOutflow: number;
  goalOutflows: number;
  netSavings: number;
  beginningCapital: number;
  investmentReturns: number;
  endingCapital: number;
  fireNumber: number;
  firePercentage: number;
  isFinanciallyIndependent: boolean;
  isRetired: boolean;
  pensionIncome: number;
  liquidityRatio: number;
  debtCoverageRatio: number;
  emergencyFundMonths: number;
}
```

---

## Combined Response Shape

```typescript
interface FireReportCoreResponse {
  userProfile: {
    name: string;
    age: number;
    city: string | null;
    retirementAge: 60;
    annualIncome: number;
    totalAnnualExpenses: number;
  };
  computedMetrics: ComputedMetrics;
  fireCalculator: FireCalculatorResult;
  thirtyYearProjection: YearlyProjection[];   // always 30 rows
}
```

---

## File Structure

```
src/
├── lib/
│   └── fire-report.types.ts        ← NEW: all interfaces + FIRE_CONSTANTS
├── services/
│   └── fire-report.service.ts      ← NEW: FireReportServiceClass
├── controller/
│   └── fire-report.controller.ts   ← NEW: getFireReport handler
└── routes/
    └── fire-report.router.ts       ← NEW: GET / → getFireReport
```

Plus one line in `src/server.ts`:
```typescript
app.use("/api/v1/fire-report", fire_report_router)
```

---

## Implementation Steps (sequential — each depends on previous)

### Step 1 — `src/lib/fire-report.types.ts`
Define:
- `FIRE_CONSTANTS` object (all hardcoded rates and defaults)
- `ComputedMetrics` interface
- `FireCalculatorResult` interface
- `YearlyProjection` interface
- `NormalizedGoal` internal type
- `TrackedLoan` internal type
- `FireReportCoreResponse` interface

No DB access. Pure TypeScript types.

---

### Step 2 — `src/services/fire-report.service.ts`

Class `FireReportServiceClass` with one public method and private helpers:

```typescript
class FireReportServiceClass {

  // PUBLIC — called by controller
  async generateFireReport(userId: string): Promise<FireReportCoreResponse>

  // PRIVATE — data access helpers
  private async fetchAllData(userId: string)
  // → returns { user, finance, assets, loans, goals } via Promise.all

  // PRIVATE — data normalization
  private extractAge(dob: Date | null): number
  private normalizeGoals(goals: UserGoals[], currentYear: number): NormalizedGoal[]
  private normalizeLoans(loans: UserLoan[]): TrackedLoan[]

  // PRIVATE — computation engines
  private computeMetrics(finance, assets, loans): ComputedMetrics
  private computeFireCalculator(metrics: ComputedMetrics, age: number): FireCalculatorResult
  private computeThirtyYearProjection(
    metrics: ComputedMetrics,
    age: number,
    loans: TrackedLoan[],
    goals: NormalizedGoal[]
  ): YearlyProjection[]
}

export const fire_report_service = new FireReportServiceClass();
```

**Key implementation notes for `computeThirtyYearProjection`**:
- Deep-copy the `TrackedLoan[]` array before the loop — do NOT mutate the original (loan tenure must be mutable per-loop but not affect subsequent calls)
- `cash_saving` and `liquidAssets` values for auxiliary metrics come from the initial `computedMetrics` snapshot — they do not update year-by-year in this model (same behavior as old version)
- `goals` processing: `years_left` from DB is used to compute `targetYear = currentYear + years_left`. If `years_left` is null/0, that goal never triggers in the projection

---

### Step 3 — `src/controller/fire-report.controller.ts`

```typescript
import { fire_report_service } from "../services/fire-report.service.js";

export const fire_report_controller = {
  async getFireReport(req: Request, res: Response, next: NextFunction) {
    try {
      const user_id = req.body.user.id;  // set by JWT middleware
      const report = await fire_report_service.generateFireReport(user_id);
      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  },
};
```

---

### Step 4 — `src/routes/fire-report.router.ts`

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/jwt.js";
import { fire_report_controller } from "../controller/fire-report.controller.js";

export const fire_report_router = Router();

fire_report_router.get("/", authenticate, fire_report_controller.getFireReport);
```

---

### Step 5 — Update `src/server.ts`

Add these 2 lines in the imports and routes sections:

```typescript
// Import (with other route imports)
import { fire_report_router } from "./routes/fire-report.router.js"

// Mount (with other app.use lines)
app.use("/api/v1/fire-report", fire_report_router)
```

---

## Edge Cases & Guards Summary

| Scenario | Handling |
|---|---|
| `UserFinance` record not found | All finance values = 0 |
| `UserAssets` record not found | All asset values = 0 |
| `UserLoan[]` empty | totalLiabilities = 0, totalMonthlyEMI = 0 |
| `UserGoals[]` empty | No goal outflows in projection |
| `User.dob` is null | age = 30 (default) |
| `annual_income` = 0 | savingsRate = 0, debtToIncomeRatio = 0 |
| `fireNumber` = 0 (zero expenses) | firePercentage = 0, yearsToFire = 0 |
| `annualSavings` ≤ 0 | yearsToFire = 99 |
| `remainingAmount` ≤ 0 | yearsToFire = 0, monthlyInvestmentRequired = 0 |
| `(1+r)^n - 1` ≈ 0 in PMT | monthlyInvestmentRequired = remainingAmount (lump sum fallback) |
| Goal with null `years_left` | Skip that goal (never triggers in projection) |
| Goal with null `current_goal_cost` | todaysCost = 0, futureValue = 0 (no outflow) |
| Credit card loan | No tenure countdown — EMI applies every year |
| Loan tenure runs out mid-projection | EMI drops to 0 from that year onwards |
| `endingCapital` goes negative before max(0) | Clamped to 0 — portfolio depleted |

---

## Verification Checklist

After implementation, verify these manually with Postman:

```
1. Basic smoke test
   → Hit GET /api/v1/fire-report with valid auth token
   → Response has: userProfile, computedMetrics, fireCalculator, thirtyYearProjection
   → thirtyYearProjection.length === 30

2. computedMetrics accuracy
   → User with annual_income=1200000, all expenses sum=720000, one home loan EMI=60000/month
   → totalAnnualExpenses = 720000
   → totalMonthlyEMI = 60000
   → annualSavings = 1200000 - 720000 - 720000 = -240000 (negative is correct)

3. fireCalculator accuracy
   → Same user: fireNumber = 720000 × 25 = 18000000 (₹1.8Cr)
   → If netWorth = 1800000 → firePercentage = 10%
   → annualSavings negative → yearsToFire = 99

4. thirtyYearProjection structure
   → Row 0: year = 2026, age = userAge
   → Row 29: year = 2055, age = userAge + 29
   → Retirement year row: isRetired = true, income = capital × 0.04

5. Goal outflow test
   → Add a goal with years_left=5, current_goal_cost=1000000, inflation_rate=6
   → In projection row for year 2031: goalOutflows ≈ 1000000 × 1.06^5 ≈ 1338226

6. Loan payoff test
   → Add home loan with tenure_months=12 (1 year)
   → Row 0: emiOutflow includes this loan's EMI × 12
   → Row 1 onwards: this loan's EMI = 0

7. Retirement switch test
   → User age 58, retirementAge = 60
   → Row index 2 (year 2028, age 60): isRetired = true
   → Row index 2 income = endingCapital of row index 1 × 0.04

8. Empty user test
   → User with no finance/assets/loan/goal records
   → Should return zeroed computedMetrics, not a 500 error
   → fireNumber = 0, yearsToFire = 0, firePercentage = 0
```

---

## Constants Reference

```typescript
export const FIRE_CONSTANTS = {
  INCOME_GROWTH_RATE: 0.08,
  EXPENSE_INFLATION_RATE: 0.06,
  EXPECTED_RETURNS_PRE_RETIREMENT: 0.12,
  EXPECTED_RETURNS_POST_RETIREMENT: 0.08,
  WITHDRAWAL_RATE: 0.04,
  FIRE_FACTOR: 25,                        // = 1 / WITHDRAWAL_RATE
  DEFAULT_AGE: 30,
  RETIREMENT_AGE: 60,                     // hardcoded, not from DB or goals
  REAL_RETURN: (1 + 0.12) / (1 + 0.06) - 1,  // ≈ 0.05660

  LOAN_ANNUAL_REDUCTION: {
    home_loan: 0.92,
    vehicle_loan: 0.85,
    personal_loan: 0.90,
    credit_card: 1.00,                    // revolving — no reduction
    default: 0.90,
  },

  GOAL_TYPE_LABELS: {
    1: "Child Education",
    2: "Child Marriage",
    3: "Retirement Fund",
    4: "Item Goal",
    default: "Financial Goal",
  },
} as const;
```
