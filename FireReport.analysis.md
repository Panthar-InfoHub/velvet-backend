# FIRE Report — Full Analysis & Implementation Guide

> **FIRE** = Financial Independence, Retire Early  
> This document covers: what the old implementation does, every formula and its reasoning, what our current Prisma models can support, what is missing, and the full implementation plan.

---

## Table of Contents

1. [What Is the FIRE Report?](#1-what-is-the-fire-report)
2. [Old Implementation Overview](#2-old-implementation-overview)
3. [Data Domains & Fields](#3-data-domains--fields)
4. [Computation Engines — Every Formula Explained](#4-computation-engines--every-formula-explained)
   - [Engine 1 — Computed Metrics](#engine-1--computed-metrics)
   - [Engine 2 — FIRE Calculator](#engine-2--fire-calculator)
   - [Engine 3 — 30-Year Projection](#engine-3--30-year-projection)
   - [Engine 4 — Financial Health Score](#engine-4--financial-health-score)
   - [Engine 5 — Risk Assessment](#engine-5--risk-assessment)
   - [Engine 6 — Insurance Requirements](#engine-6--insurance-requirements)
5. [UI Components & What They Display](#5-ui-components--what-they-display)
6. [Current Prisma Models vs Old Data Requirements](#6-current-prisma-models-vs-old-data-requirements)
7. [Gap Analysis — What We Are Lacking](#7-gap-analysis--what-we-are-lacking)
8. [Field-by-Field Mapping Table](#8-field-by-field-mapping-table)
9. [Implementation Plan](#9-implementation-plan)
10. [Hardcoded Constants & Defaults](#10-hardcoded-constants--defaults)

---

## 1. What Is the FIRE Report?

The FIRE Report is a personal finance dashboard that answers one central question:

> **"When can you stop working and live off your investments forever?"**

It does this by:
- Computing your current **net worth** and **annual expenses**
- Calculating your **FIRE Number** — the total wealth required to retire safely
- Measuring your current **FIRE Progress %** — how close you are
- Projecting your finances **30 years into the future** — year by year
- Scoring your **Financial Health** across 5 dimensions
- Assessing your **Financial Risk** level
- Identifying **Insurance gaps** — where you are underprotected

---

## 2. Old Implementation Overview

The old version is a **React context + hook** (`useComprehensiveWealth`) that:

1. Holds all financial data in local React state (user profile, assets, liabilities, goals, insurance, growth rates)
2. Runs all 6 computation engines as `useMemo` hooks on the frontend
3. Syncs changes to the backend via `fetch` calls (fire-and-forget, no error blocking)
4. Exposes one context object with all computed values for downstream components

**Architecture flaw in old version**: All computation is on the client. This means:
- No server-side validation of computed results
- Sensitive financial data computed in browser
- No single source of truth for FIRE numbers

**Our approach**: Move all computation to a dedicated backend service. The API returns a pre-computed `FireReportResponse`. The frontend only renders.

---

## 3. Data Domains & Fields

The old version requires 5 data domains as input to compute everything:

### Domain 1 — User Profile
```
name              — display only
age               — drives retirement countdown, risk scoring
city              — display only
retirementAge     — when the 30-year projection switches income model
annualIncomePostTax — base for all savings/ratio calculations
baseHouseholdExpenses — fixed living costs (rent, food, utilities)
discretionaryExpenses — lifestyle spending
```

### Domain 2 — Assets (8 sub-categories in old version)
```
mutualFunds:
  currentValue        — current portfolio worth
  expectedReturn      — 12% default
  monthlyInvestment   — how much added each month

stocks:
  currentValue        — current holdings worth
  expectedReturn      — 15% default
  monthlyInvestment   — how much added each month

fixedDeposits:
  currentValue        — 6.5% default return

ppfEpf:
  currentValue        — 7.1% default return
  yearlyContribution

nps:
  currentValue        — 9% default return
  monthlyContribution

realEstate:
  residenceHouse      — primary home value
  investedLand        — land investments
  commercialProperty  — commercial holdings
  expectedGrowth      — 7% default
  rentalIncome

gold:
  physicalGold
  digitalGold
  expectedGrowth      — 8% default

cashAndBank:
  savingsAccount
  currentAccount
  emergencyFund       — key metric for liquidity scoring
```

### Domain 3 — Liabilities (4 loan types)
```
homeLoan:
  outstanding         — remaining principal
  emi                 — monthly payment
  interestRate        — 8.5% typical
  remainingTenure     — months left
  prepaymentOptions

vehicleLoan:
  outstanding, emi, interestRate (9.5%), remainingTenure

personalLoan:
  outstanding, emi, interestRate, remainingTenure

creditCard:
  outstanding, minimumPayment, interestRate (36%)
```

### Domain 4 — Insurance (3 types)
```
termLife:
  currentCover        — cover amount
  requiredCover       — computed by Engine 6
  premium

health:
  currentCover
  requiredCover
  premium

criticalIllness:
  currentCover
  requiredCover
  premium
```

### Domain 5 — Goals
```
Per goal:
  id
  name
  todaysCost          — cost in today's money
  targetYear          — calendar year when money is needed
  inflationRate       — how fast this cost inflates
  frequency           — "One-time" typically
  category            — Retirement, Child Education, etc.
```

### Domain 6 — Growth Rates (all hardcoded, not per-user)
```
incomeGrowth:        8%   — salary increment assumption
expenseInflation:    6%   — general inflation
mutualFundReturn:    12%
stockReturn:         15%
fdReturn:            6.5%
ppfReturn:           7.1%
npsReturn:           9%
realEstateGrowth:    7%
goldGrowth:          8%
educationInflation:  10%
weddingInflation:    8%
healthInflation:     10%
lifestyleInflation:  8%
```

---

## 4. Computation Engines — Every Formula Explained

### Engine 1 — Computed Metrics

Base layer. All other engines depend on these numbers.

```
totalAssets = sum of ALL asset values across all 8 sub-categories

totalLiabilities = sum of all outstanding loan amounts

netWorth = totalAssets - totalLiabilities
  → The single most important wealth indicator

monthlyIncome = annualIncomePostTax / 12

totalAnnualExpenses = baseHouseholdExpenses + discretionaryExpenses
  → Full yearly spending (NOT including EMI — EMI is separate)

totalMonthlyEMI = homeLoan.emi + vehicleLoan.emi + personalLoan.emi + creditCard.minimumPayment

annualSavings = annualIncome - totalAnnualExpenses - (totalMonthlyEMI × 12)
  → What's left after all spending AND all debt payments
  → Can be negative if someone is over-leveraged

savingsRate = (annualSavings / annualIncome) × 100
  → % of income actually saved

monthlyAvailableSurplus = monthlyIncome - (totalAnnualExpenses / 12) - totalMonthlyEMI
  → Free cash each month after obligations

liquidAssets = mutualFunds + stocks + FD + savings + current + emergencyFund
  → Assets convertible to cash quickly (within days to weeks)

illiquidAssets = totalAssets - liquidAssets
  → Real estate + gold + PPF/EPF/NPS (slow to convert)

debtToIncomeRatio = (totalMonthlyEMI / monthlyIncome) × 100
  → RBI guideline: keep below 40-50%
```

---

### Engine 2 — FIRE Calculator

The heart of the report. Uses the universal **4% Safe Withdrawal Rule**.

#### The 4% Rule
Research (Trinity Study, 1998) showed that a portfolio invested in broad equities can sustain a **4% annual withdrawal indefinitely** without running out of money over a 30-year horizon at historical stock market returns. This means:

```
fireNumber = totalAnnualExpenses × 25
  → 25 = 1 / 0.04 (inverse of 4%)
  → If you spend ₹7.2L/year, you need ₹1.8Cr to retire
  → This is the total wealth target
```

#### How Many Years to FIRE?

Uses the **Present Value of Annuity** formula:

```
realReturn = (1 + expectedReturns) / (1 + inflationRate) - 1
  → 12% nominal return, 6% inflation → ~5.66% real return
  → Real return matters because your FIRE number grows with inflation too

remainingAmount = fireNumber - currentNetWorth
  → The gap you need to close

monthlyInvestment = annualSavings / 12
monthlyRate = (1 + realReturn)^(1/12) - 1

yearsToFire = ln(1 + (remainingAmount × monthlyRate / monthlyInvestment))
              / ln(1 + monthlyRate)
              / 12

  → This is solving the annuity equation for time:
    FV = PMT × [((1 + r)^n - 1) / r]
    where FV = remainingAmount, PMT = monthlyInvestment, r = monthlyRate
```

#### Monthly Investment Required

Reverse calculation — given the yearsToFire, how much must you invest each month?

```
monthlyInvestmentRequired = (remainingAmount × (realReturn/12))
                            / ((1 + realReturn/12)^(yearsToFire×12) - 1)
```

#### FIRE Percentage (Progress)

```
firePercentage = (currentNetWorth / fireNumber) × 100
  → 0% = haven't started
  → 100% = you can retire today
```

---

### Engine 3 — 30-Year Projection

A **year-by-year simulation** — the most complex engine. Runs a loop 30 times.

Each iteration takes last year's ending state as this year's starting state.

#### Per-Year Calculations

```
Step 1 — Check retirement status
  isRetired = (currentAge >= retirementAge)

Step 2 — Update income
  if NOT retired:
    annualIncome = annualIncome × (1 + 0.08)  ← 8% salary growth
  else:
    annualIncome = currentCapital × 0.04       ← 4% withdrawal from portfolio
    (you live off your investments in retirement)

Step 3 — Update expenses
  annualExpenses = annualExpenses × (1 + 0.06)  ← 6% inflation every year

Step 4 — Calculate EMI for this year
  For each loan:
    if remainingTenure > 0:
      totalEMI += loan.emi × 12
      remainingTenure -= 12
      outstanding × = 0.92  ← rough home loan principal reduction (~8%/year)
    else:
      that loan's EMI drops to 0 (loan paid off)
  
  Vehicle loan uses 0.85 (15%/year principal reduction — shorter tenure)

Step 5 — Check goal outflows
  For each user goal:
    if goal.targetYear === thisYear:
      futureValue = todaysCost × (1 + inflationRate)^yearsToGoal
      goalOutflows += futureValue
  (Inflation-adjusts the goal cost to what it will actually cost in that year)

Step 6 — Net Savings
  netSavings = annualIncome - annualExpenses - totalEMI - goalOutflows
  (Can be negative in bad years — large goal outflows, high EMIs, early career)

Step 7 — Portfolio growth
  weightedReturn = isRetired ? 0.08 : 0.12
  (More conservative investment allocation in retirement)
  investmentReturns = currentCapital × weightedReturn

Step 8 — End of year portfolio
  endingCapital = max(0, currentCapital + netSavings + investmentReturns)
  (Capped at 0 — portfolio can't go negative in this model)

Step 9 — FIRE metrics for this year
  fireNumber = annualExpenses × 25
  (FIRE target grows every year because expenses grow with inflation)
  firePercentage = (endingCapital / fireNumber) × 100
  isFinanciallyIndependent = (firePercentage >= 100)

Step 10 — Other metrics stored per year
  emergencyFundMonths = emergencyFund / (annualExpenses / 12)
  liquidityRatio = liquidAssets / (annualExpenses / 12)
  debtCoverageRatio = netSavings / max(totalEMI, 1)

  currentCapital = endingCapital  ← carry forward
```

Each year produces a row:
```
{ year, age, income, expenses, emiOutflow, goalOutflows, netSavings,
  beginningCapital, investmentReturns, endingCapital,
  fireNumber, firePercentage, isFinanciallyIndependent, isRetired,
  pensionIncome, liquidityRatio, debtCoverageRatio, emergencyFundMonths }
```

---

### Engine 4 — Financial Health Score

Produces 5 sub-scores (0–100 each) and an overall average.

```
Liquidity Score = min(100, (emergencyFund / monthlyExpenses) × 20)
  → emergencyFund / monthlyExpenses = number of months covered
  → ×20 means 5 months covered = 100 score
  → Target: 6 months; score of 120 capped to 100

Debt Score = max(0, 100 - (debtToIncomeRatio × 2))
  → 0% DTI = 100 score
  → 50% DTI = 0 score
  → >50% DTI = 0 score (clamped at 0)

Savings Score = min(100, savingsRate × 5)
  → 20% savings rate = 100 score (financial advisors recommend 20%+)

Insurance Score:
  termLifeAdequacy = (termLifeCover / (annualIncome × 10)) × 100
  healthAdequacy = (healthCover / (annualIncome × 2)) × 100
  insuranceScore = min(100, (termLifeAdequacy + healthAdequacy) / 2)
  → 10× income life cover = adequate; 2× income health = adequate

Diversification Score = (nonZeroAssetTypes / 5) × 100
  → Checks: mutualFunds, stocks, FD, realEstate, gold
  → All 5 non-zero = 100; only 1 non-zero = 20

Overall = (liquidity + debt + savings + insurance + diversification) / 5
```

---

### Engine 5 — Risk Assessment

Starts at base score 50. Higher score = higher risk.

```
Base score: 50

Age adjustments:
  age < 30:  -10  (young → more time to recover from risk)
  age > 50:  +15  (near retirement → less recovery time)

Debt adjustment:
  debtToIncomeRatio > 40%: +20
  flag: "High debt-to-income ratio"

Emergency fund adjustment:
  emergencyFund < 6 months expenses: +15
  flag: "Insufficient emergency fund"

Equity concentration adjustment:
  stocks > 70% of (MF + stocks + FD): +10
  flag: "High equity concentration"

Insurance adjustment:
  termLifeCover < annualIncome × 10: +10
  flag: "Inadequate life insurance"

Liquidity adjustment:
  liquidAssets < 30% of totalAssets: +10
  flag: "Low liquidity ratio"

Score clamped: max(0, min(100, score))

Level mapping:
  score < 30  → "low"
  score < 60  → "moderate"
  score < 80  → "high"
  score ≥ 80  → "very-high"

Recommendations (text):
  If emergency < 6 months: "Build emergency fund to 6 months expenses"
  If DTI > 30%: "Reduce debt burden"
  If savingsRate < 20%: "Increase monthly savings rate"
  If lifeCover < 10× income: "Increase life insurance coverage"
```

---

### Engine 6 — Insurance Requirements

Calculates **how much** cover is needed and the **gap** vs. current cover.

```
Term Life Required:
  age ≤ 30: annualIncome × 20  (young, longest earning years ahead)
  age ≤ 40: annualIncome × 18
  age ≤ 50: annualIncome × 15
  age > 50: annualIncome × 10  (fewer earning years, smaller coverage)

Health Cover Required:
  max(annualIncome × 2, ₹20,00,000)
  → At minimum ₹20L; higher earners need proportionally more

Critical Illness Required:
  annualIncome × 5
  → For income replacement during long illness/treatment

Gaps:
  termLifeGap = max(0, termLifeRequired - termLifeCurrent)
  healthGap = max(0, healthRequired - healthCurrent)
  criticalGap = max(0, criticalRequired - criticalCurrent)
```

---

## 5. UI Components & What They Display

The `FireReport.tsx` component renders 4 sections:

### Section 1 — Header & Controls
- Title, subtitle
- Period selector (dropdown: 1 year, 2 years, 3 years, all time) — **currently UI-only, no effect**
- **EMI toggle**: Include/Exclude EMI in outflow display — affects the 30-year table only (display toggle, not recalculation)

### Section 2 — 3 Metric Cards
| Card | Value | Source |
|---|---|---|
| FIRE Number | Formatted (₹Cr/L/K) | `fireCalculator.fireNumber` |
| FIRE Progress | Percentage | `netWorth / fireNumber × 100` |
| Years to FIRE | Rounded years | `fireCalculator.yearsToFire` |

### Section 3 — FIRE Progress Meter + Quarterly Trends (side by side)
- **FIREProgressMeter**: A visual gauge showing firePercentage, netWorth vs fireNumber, yearsToFire, monthlyInvestmentRequired
- **QuarterlyTrendChart**: 12 quarters of simulated historical netWorth and FIRE% — **this is NOT real historical data**, it's mathematically back-calculated from current values

### Section 4 — 30-Year FIRE Projection Table
Columns: Year | Age | Current Portfolio | Net Outflow | Goals | FIRE Number | FIRE % | (Status)

Row coloring:
- Blue highlight: row where `age === retirementAge`
- Green highlight: first row where `firePercentage >= 100`

Toggle behavior:
- EMI toggle ON: `netOutflow = expenses + emiOutflow + goalOutflows`
- EMI toggle OFF: `netOutflow = expenses + goalOutflows`; shows "+₹X EMI" as sub-text

---

## 6. Current Prisma Models vs Old Data Requirements

### Model: `User`
```prisma
full_name   → name ✅
dob         → age (calculate: floor((today - dob) / 365.25)) ✅
city        → city ✅
            → retirementAge ⚠️ NOT in User model — comes from UserGoals (goal_type_id=3)
```

### Model: `UserFinance`
```prisma
annual_income          → annualIncomePostTax ✅
expense_house          → part of baseHouseholdExpenses ✅
expense_food           → part of baseHouseholdExpenses ✅
expense_transportation → part of baseHouseholdExpenses ✅
expense_others         → maps to discretionaryExpenses ✅

totalAnnualExpenses = expense_house + expense_food + expense_transportation + expense_others
```

### Model: `UserAssets`
```prisma
mututal_funds  → mutualFunds.currentValue ✅ (note: typo in field name)
stocks         → stocks.currentValue ✅
fd             → fixedDeposits.currentValue ✅
real_estate    → sum of (residenceHouse + investedLand + commercial) ✅ (aggregated)
gold           → sum of (physicalGold + digitalGold) ✅ (aggregated)
cash_saving    → sum of (savingsAccount + currentAccount + emergencyFund) ✅ (aggregated)

MISSING:       → No per-asset expectedReturn → use hardcoded defaults
MISSING:       → No monthlyInvestment per asset type
MISSING:       → No PPF/EPF breakdown
MISSING:       → No NPS breakdown
MISSING:       → No rental income
MISSING:       → No emergency fund as a separate field (merged into cash_saving)
```

### Model: `UserLoan[]`
```prisma
loan_type          → identifies home/vehicle/personal/credit_card ✅
outstanding_amount → outstanding ✅
monthly_emi        → emi ✅
tenure_months      → remainingTenure ✅
loan_name          → display name ✅

MISSING: interest_rate → stored in old version but NOT used in FIRE calculations
```

### Model: `UserInsurance`
```prisma
life_insurance    → termLife.currentCover ✅
health_insurance  → health.currentCover ✅

MISSING: criticalIllness.currentCover → no field, default to 0
MISSING: premium amounts → not stored
```

### Model: `UserGoals[]`
```prisma
goal_type_id=3 (Retirement):
  current_age            → for calculating age at simulation time ✅
  retirement_age         → retirementAge ✅
  life_expectancy        → NOT used in FIRE calc (FinSys only) ⚠️
  current_monthly_expense → can cross-verify vs UserFinance ✅
  post_retirement_return → NOT used in FIRE calc (hardcoded 8%) ⚠️

For all goals:
  current_goal_cost  → todaysCost ✅
  inflation_rate     → inflationRate (divide by 100 to get decimal rate) ✅
  years_left         → targetYear = currentYear + years_left ✅
  goal_name          → name ✅
  child_name         → name for child goals ✅

MISSING: goal category label (e.g., "Retirement", "Child Education") — derive from goal_type_id
MISSING: frequency field ("One-time" vs recurring) — all goals treated as one-time in projection
```

---

## 7. Gap Analysis — What We Are Lacking

### 🔴 Critical — Will affect computation accuracy

| What's Missing | Impact | Workaround |
|---|---|---|
| **Per-asset expected returns** (e.g., MF = 12%, stocks = 15%) | Engine 3 projection uses a single weighted average return instead of per-asset returns | Use hardcoded defaults: MF=12%, stocks=15%, FD=6.5%, real_estate=7%, gold=8% — same as old version defaults |
| **Separate emergency fund field** | Engine 4 liquidity score uses full `cash_saving` as emergency fund proxy | Treat `cash_saving` as emergency fund — slightly over-estimates liquidity |
| **Critical illness insurance amount** | Engine 6 gap will always show full `annualIncome × 5` as gap | Default criticalIllnessCover = 0, gap = full requirement |

### 🟡 Moderate — Reduces richness of data

| What's Missing | Impact | Workaround |
|---|---|---|
| **PPF/EPF/NPS as separate asset categories** | These retirement accounts not tracked separately; no individual return % | Excluded from computation entirely — net worth will be lower than reality for users with large PF |
| **Monthly investment amounts per asset** | Cannot compute "monthly savings from investments" allocation | `annualSavings / 12` used as total monthly investment across all assets |
| **Rental income** | Passive income not included in annual income calc | Excluded; user's `annual_income` in `UserFinance` must already include rental income |
| **Real estate sub-breakdown** (residence vs invested) | Old version excluded primary home from liquid assets | All `real_estate` is correctly treated as illiquid regardless |

### 🟢 Minor — Display only, no calculation impact

| What's Missing | Impact | Workaround |
|---|---|---|
| **Insurance premiums** | Cannot show premium amounts in UI | Remove premium display from UI |
| **Loan interest rate** | Not used in any FIRE calculation | Skip entirely |
| **Selected period filter** (header dropdown in FireReport.tsx) | UI filter has no data to filter (no real historical records) | Show "All Time" as static label |
| **Quarterly trend chart real data** | Chart shows simulated back-calculation, not real historical netWorth | Keep frontend simulation — NOT from API |
| **Goal frequency** (one-time vs recurring) | All goals are treated as one-time in projection | Acceptable simplification for v1 |

### 🔵 Architectural Differences

| Old Version | Our Version |
|---|---|
| Computation in React frontend (useMemo) | Computation in Node.js backend service |
| State management in React context | Stateless — fetch from DB each request |
| Per-user growth rates not supported | Can add as optional query params later |
| Quarterly data is simulated on client | Quarterly data remains simulated on client |
| All 6 engines run even for partial data | All 6 engines must handle null/zero records |

---

## 8. Field-by-Field Mapping Table

### Assets Mapping

| Old Field | Our `UserAssets` Field | Notes |
|---|---|---|
| `mutualFunds.currentValue` | `mututal_funds` (⚠️ typo in DB) | Direct value map |
| `stocks.currentValue` | `stocks` | Direct value map |
| `fixedDeposits.currentValue` | `fd` | Direct value map |
| `realEstate.residenceHouse + investedLand + commercial` | `real_estate` | Aggregated into one field |
| `gold.physicalGold + gold.digitalGold` | `gold` | Aggregated into one field |
| `cashAndBank.savingsAccount + currentAccount + emergencyFund` | `cash_saving` | Aggregated; emergency fund proxy |
| `ppfEpf.currentValue` | ❌ **Not in our model** | Excluded from computation |
| `nps.currentValue` | ❌ **Not in our model** | Excluded from computation |

### Loan Mapping

| Old Field | Our `UserLoan` Field | Mapping Notes |
|---|---|---|
| `homeLoan.outstanding` | `outstanding_amount` where `loan_type = "home_loan"` | Direct |
| `homeLoan.emi` | `monthly_emi` | Direct |
| `homeLoan.remainingTenure` | `tenure_months` | Direct |
| `vehicleLoan.*` | Same fields where `loan_type = "vehicle_loan"` | Direct |
| `personalLoan.*` | Same fields where `loan_type = "personal_loan"` | Direct |
| `creditCard.outstanding` | `outstanding_amount` where `loan_type = "credit_card"` | Direct |
| `creditCard.minimumPayment` | `monthly_emi` | Reuse EMI field for minimum payment |
| `homeLoan.interestRate` | ❌ **Not stored** | Not used in FIRE anyway |

### Insurance Mapping

| Old Field | Our `UserInsurance` Field |
|---|---|
| `termLife.currentCover` | `life_insurance` |
| `health.currentCover` | `health_insurance` |
| `criticalIllness.currentCover` | ❌ **Not stored** → default 0 |
| Any premium | ❌ **Not stored** → excluded |

### Goal Mapping

| Old Field | Our `UserGoals` Field | Notes |
|---|---|---|
| `todaysCost` | `current_goal_cost` | Direct (Decimal → Number) |
| `targetYear` | `currentYear + years_left` | Compute from years_left |
| `inflationRate` | `inflation_rate / 100` | Our DB stores as integer (e.g., 6), old expects decimal (0.06) |
| `name` | `goal_name` or derive from `goal_type_id` | Type 1=Child Education, 2=Child Marriage, 3=Retirement, 4=Item |
| `retirementAge` | `retirement_age` on goal_type_id=3 | Only on retirement goal |
| `currentAge` (for projection start) | `User.dob` → calculate age | More accurate than goal's `current_age` |

---

## 9. Implementation Plan

### Phase 1 — Type Definitions

**File**: `src/lib/fire-report.types.ts` (new file)

Define these TypeScript interfaces:
```
FireReportResponse
  ├── userProfile: UserProfileSnapshot
  ├── computedMetrics: ComputedMetrics
  ├── fireCalculator: FireCalculatorResult
  ├── thirtyYearProjection: YearlyProjection[]
  ├── financialHealthScore: FinancialHealthScore
  ├── riskAssessment: RiskAssessment
  └── insuranceRequirements: InsuranceRequirements

FIRE_CONSTANTS (object with all hardcoded rates)
```

### Phase 2 — Core Service

**File**: `src/services/fire-report.service.ts` (new file)

Single class `FireReportServiceClass` with:

```
generateFireReport(userId)
  → Fetches all 5 domains in parallel (Promise.all)
  → Converts Decimal → Number for all Prisma values
  → Calls 6 private computation methods
  → Returns FireReportResponse

Private methods:
  _computeMetrics(finance, assets, loans)
  _computeFireCalculator(metrics)
  _computeThirtyYearProjection(metrics, age, retirementAge, loans, goals)
  _computeFinancialHealthScore(metrics, assets, insurance)
  _computeRiskAssessment(metrics, assets, insurance, age)
  _computeInsuranceRequirements(age, annualIncome, insurance)
  _extractAge(dob)              ← from User.dob
  _extractRetirementAge(goals)  ← from goal_type_id=3
  _mapGoals(goals)              ← normalize goal fields
  _mapLoans(loans)              ← normalize loan fields
```

**Key data fetch pattern** (parallel for performance):
```typescript
const [user, finance, assets, loans, insurance, goals] = await Promise.all([
  db.user.findUnique({ where: { id: userId } }),
  db.userFinance.findUnique({ where: { user_id: userId } }),
  db.userAssets.findUnique({ where: { user_id: userId } }),
  db.userLoan.findMany({ where: { user_id: userId } }),
  db.userInsurance.findUnique({ where: { user_id: userId } }),
  db.userGoals.findMany({ where: { user_id: userId } }),
]);
```

### Phase 3 — Controller

**File**: `src/controller/fire-report.controller.ts` (new file)

```
getFireReport(req, res, next)
  → Extract user_id from req.body.user.id (JWT middleware)
  → Call fire_report_service.generateFireReport(user_id)
  → Return StandardJSON success response
  → Pass errors to next(err)
```

### Phase 4 — Route

**File**: `src/routes/fire-report.router.ts` (new file)

```
GET /  → authenticate → getFireReport
```

### Phase 5 — Mount in Server

**File**: `src/server.ts` (existing file, add 2 lines)

```typescript
import { fire_report_router } from "./routes/fire-report.router.js"
app.use("/api/v1/fire-report", fire_report_router)
```

### Phase 6 — Edge Case Handling (inside service)

Every missing record must be handled gracefully:

| Null Case | Default |
|---|---|
| `UserFinance` not found | All zeros |
| `UserAssets` not found | All zeros |
| `UserInsurance` not found | `{ life_insurance: 0, health_insurance: 0 }` |
| `UserLoan[]` empty | No EMI, no liabilities |
| `UserGoals[]` empty | No goals, retirementAge defaults to 60 |
| `User.dob` null | Age defaults to 30 |
| `annualSavings <= 0` | `yearsToFire = 99` (cannot reach FIRE) |
| Any division by zero | Guard with `|| 1` or `|| 0` as appropriate |

---

## 10. Hardcoded Constants & Defaults

These match the old version's defaults exactly:

```typescript
const FIRE_CONSTANTS = {
  // Growth rates
  incomeGrowth: 0.08,            // 8% annual salary increment
  expenseInflation: 0.06,        // 6% general inflation
  
  // Asset returns (used when per-asset return not stored)
  expectedReturns: 0.12,         // 12% weighted average portfolio return
  postRetirementReturn: 0.08,    // 8% conservative post-retirement return
  
  // FIRE rule
  withdrawalRate: 0.04,          // 4% safe withdrawal rate
  fireFactor: 25,                // = 1 / withdrawalRate
  
  // Default user values (when DB records missing)
  defaultAge: 30,
  defaultRetirementAge: 60,

  // Loan amortization approximations (per-year)
  homeLoanPrincipalReduction: 0.08,      // 8%/year principal reduction
  vehicleLoanPrincipalReduction: 0.15,   // 15%/year
  otherLoanPrincipalReduction: 0.10,     // 10%/year

  // Financial health thresholds
  emergencyFundTarget: 6,        // months of expenses
  savingsRateTarget: 0.20,       // 20%
  debtToIncomeMax: 0.40,         // 40%
  equityConcentrationMax: 0.70,  // 70%
  liquidityMinRatio: 0.30,       // 30% of total assets
  termLifeMultiplierBase: 15,    // × annual income
};
```

---

## Summary: Can We Build This With Our Current Models?

**Yes — fully.** Every computation from the old version can be replicated.

| Engine | Feasible? | Notes |
|---|---|---|
| Computed Metrics | ✅ Full parity | All fields present |
| FIRE Calculator | ✅ Full parity | Pure math, no extra fields needed |
| 30-Year Projection | ✅ Full parity | Loan tenure + goals + income all present |
| Financial Health Score | ✅ ~95% parity | Emergency fund proxied by cash_saving |
| Risk Assessment | ✅ Full parity | All inputs available |
| Insurance Requirements | ✅ Full parity | Gaps computable even without critical illness |

The only simplifications vs. old version:
- PPF/EPF/NPS excluded (not in our DB)
- Critical illness cover always 0 (not in our DB)
- Emergency fund = cash_saving (merged field)
- Per-asset return rates use hardcoded defaults (not user-configurable)
- Quarterly trend chart stays frontend-simulated

These simplifications match v1 scope and can be improved by adding DB columns in a future migration.
