-- CreateTable
CREATE TABLE "MfProduct" (
    "id" TEXT NOT NULL,
    "scheme_code" TEXT NOT NULL,
    "scheme_name" TEXT NOT NULL,
    "fund_house" TEXT NOT NULL,
    "scheme_type" TEXT NOT NULL,
    "scheme_category" TEXT NOT NULL,
    "isin_growth" TEXT NOT NULL,
    "isin_div_reinvestment" TEXT NOT NULL,
    "latest_nav" DECIMAL(18,4) NOT NULL,
    "latest_nav_date" TIMESTAMP(3) NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfNav" (
    "id" TEXT NOT NULL,
    "mf_product_id" TEXT NOT NULL,
    "scheme_code" TEXT NOT NULL,
    "nav_date" TIMESTAMP(3) NOT NULL,
    "nav_value" DECIMAL(18,4) NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfNav_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfMetrics" (
    "id" TEXT NOT NULL,
    "mf_product_id" TEXT NOT NULL,
    "return_1m" DECIMAL(6,2) NOT NULL,
    "return_6m" DECIMAL(6,2) NOT NULL,
    "return_1y" DECIMAL(6,2) NOT NULL,
    "return_3y" DECIMAL(6,2) NOT NULL,
    "return_5y" DECIMAL(6,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFinance" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "annual_income" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "expense_house" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "expense_food" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "expense_transportation" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "expense_others" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFinance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAssets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mututal_funds" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "stocks" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "fd" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "real_estate" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "gold" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "cash_saving" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAssets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInsurance" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "life_insurance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "health_insurance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInsurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLoan" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "loan_type" TEXT NOT NULL,
    "loan_name" TEXT,
    "outstanding_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "monthly_emi" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "tenure_months" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGoals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "goal_id" INTEGER,
    "goal_type_id" INTEGER NOT NULL,
    "inflation_rate" INTEGER NOT NULL,
    "return_rate" INTEGER NOT NULL,
    "current_saved_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "goal_name" TEXT,
    "goal_item_id" INTEGER,
    "goal_item_name" TEXT,
    "child_name" TEXT,
    "child_age" INTEGER,
    "years_left" INTEGER,
    "current_goal_cost" DECIMAL(12,2),
    "current_age" INTEGER,
    "retirement_age" INTEGER,
    "life_expectancy" INTEGER,
    "current_monthly_expense" DECIMAL(12,2),
    "post_retirement_return" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGoals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "full_name" TEXT,
    "inv_id" TEXT,
    "usr" TEXT,
    "pwd" TEXT,
    "email" TEXT,
    "phone_no" TEXT,
    "city" TEXT,
    "dob" TIMESTAMP(3),
    "fcm_token" TEXT,
    "meta_data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MfProduct_scheme_code_key" ON "MfProduct"("scheme_code");

-- CreateIndex
CREATE INDEX "MfProduct_fund_house_idx" ON "MfProduct"("fund_house");

-- CreateIndex
CREATE INDEX "MfProduct_scheme_category_idx" ON "MfProduct"("scheme_category");

-- CreateIndex
CREATE INDEX "MfProduct_latest_nav_date_idx" ON "MfProduct"("latest_nav_date");

-- CreateIndex
CREATE INDEX "MfNav_scheme_code_nav_date_idx" ON "MfNav"("scheme_code", "nav_date");

-- CreateIndex
CREATE INDEX "MfNav_mf_product_id_nav_date_idx" ON "MfNav"("mf_product_id", "nav_date");

-- CreateIndex
CREATE UNIQUE INDEX "MfNav_scheme_code_nav_date_key" ON "MfNav"("scheme_code", "nav_date");

-- CreateIndex
CREATE UNIQUE INDEX "MfMetrics_mf_product_id_key" ON "MfMetrics"("mf_product_id");

-- CreateIndex
CREATE INDEX "MfMetrics_mf_product_id_idx" ON "MfMetrics"("mf_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserFinance_user_id_key" ON "UserFinance"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserAssets_user_id_key" ON "UserAssets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserInsurance_user_id_key" ON "UserInsurance"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserLoan_user_id_loan_type_key" ON "UserLoan"("user_id", "loan_type");

-- CreateIndex
CREATE UNIQUE INDEX "UserGoals_user_id_goal_type_id_key" ON "UserGoals"("user_id", "goal_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_inv_id_key" ON "User"("inv_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_usr_key" ON "User"("usr");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_no_key" ON "User"("phone_no");

-- AddForeignKey
ALTER TABLE "MfNav" ADD CONSTRAINT "MfNav_mf_product_id_fkey" FOREIGN KEY ("mf_product_id") REFERENCES "MfProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfMetrics" ADD CONSTRAINT "MfMetrics_mf_product_id_fkey" FOREIGN KEY ("mf_product_id") REFERENCES "MfProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFinance" ADD CONSTRAINT "UserFinance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAssets" ADD CONSTRAINT "UserAssets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInsurance" ADD CONSTRAINT "UserInsurance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLoan" ADD CONSTRAINT "UserLoan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGoals" ADD CONSTRAINT "UserGoals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
