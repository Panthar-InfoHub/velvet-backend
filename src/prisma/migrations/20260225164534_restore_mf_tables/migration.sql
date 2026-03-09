-- CreateEnum
CREATE TYPE "KycTypeValue" AS ENUM ('mf', 'fd', 'trading');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('not_started', 'initiated', 'in_progress', 'verified', 'failed');

-- CreateTable
CREATE TABLE "KycType" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kyc_type" "KycTypeValue" NOT NULL,
    "status" "KycStatus" NOT NULL,
    "failure_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfKycSession" (
    "id" TEXT NOT NULL,
    "kyc_type_id" TEXT NOT NULL,
    "merchant_id" TEXT,
    "kyc_access_token" TEXT NOT NULL,
    "digilocker_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfKycSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfKycIdentity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "pan_no" TEXT,
    "full_name" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "full_address" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "land_mark" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'INDIA',
    "marital_status" TEXT,
    "residential_status" TEXT,
    "place_of_birth" TEXT,
    "father_title" TEXT,
    "father_name" TEXT,
    "mother_title" TEXT,
    "mother_name" TEXT,
    "occupation_desc" TEXT,
    "occupation_code" TEXT,
    "kyc_account_code" TEXT DEFAULT '01',
    "communication_addr_code" TEXT DEFAULT '02',
    "permanent_addr_code" TEXT DEFAULT '02',
    "citizenship_country_code" TEXT DEFAULT '101',
    "application_status_code" TEXT DEFAULT 'R',
    "mobile_no" TEXT,
    "email_id" TEXT,
    "digilocker_photo_url" TEXT,
    "aadhaar_pdf_url" TEXT,
    "user_photo_url" TEXT,
    "signature_url" TEXT,
    "contract_pdf_url" TEXT,
    "is_final_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfKycIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfProduct" (
    "id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "isin" TEXT,
    "mapping_code" TEXT,
    "scheme_name" TEXT NOT NULL,
    "amc_id" TEXT,
    "amc_code" TEXT,
    "amc_name" TEXT,
    "asset_type" TEXT,
    "scheme_type" TEXT,
    "structure" TEXT,
    "risk_name" TEXT,
    "risk_level" INTEGER,
    "latest_nav" DECIMAL(12,4),
    "latest_nav_date" TIMESTAMP(3),
    "purchase_allowed" BOOLEAN NOT NULL DEFAULT false,
    "sip_allowed" BOOLEAN NOT NULL DEFAULT false,
    "redemption_allowed" BOOLEAN NOT NULL DEFAULT false,
    "switch_allowed" BOOLEAN NOT NULL DEFAULT false,
    "maturity_date" TIMESTAMP(3),
    "nfo_end_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfNavHistory" (
    "id" TEXT NOT NULL,
    "mf_product_id" TEXT NOT NULL,
    "scheme_id" TEXT NOT NULL,
    "nav" DECIMAL(12,4) NOT NULL,
    "nav_date" TIMESTAMP(3) NOT NULL,
    "daily_change" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfNavHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfSchemeTransactionRules" (
    "id" TEXT NOT NULL,
    "mf_product_id" TEXT NOT NULL,
    "sip_allowed_dates" INTEGER[],
    "sip_frequencies" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfSchemeTransactionRules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfMetrics" (
    "id" TEXT NOT NULL,
    "mf_product_id" TEXT NOT NULL,
    "return_30d" DOUBLE PRECISION,
    "return_90d" DOUBLE PRECISION,
    "return_6m" DOUBLE PRECISION,
    "return_1y" DOUBLE PRECISION,
    "return_3y" DOUBLE PRECISION,
    "nav_change_pct" DOUBLE PRECISION,
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
    "inv_id" INTEGER,
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
CREATE UNIQUE INDEX "KycType_user_id_kyc_type_key" ON "KycType"("user_id", "kyc_type");

-- CreateIndex
CREATE UNIQUE INDEX "MfKycSession_kyc_type_id_key" ON "MfKycSession"("kyc_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "MfKycIdentity_user_id_key" ON "MfKycIdentity"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "MfKycIdentity_pan_no_key" ON "MfKycIdentity"("pan_no");

-- CreateIndex
CREATE UNIQUE INDEX "MfProduct_scheme_id_key" ON "MfProduct"("scheme_id");

-- CreateIndex
CREATE INDEX "MfProduct_amc_code_idx" ON "MfProduct"("amc_code");

-- CreateIndex
CREATE INDEX "MfProduct_scheme_type_idx" ON "MfProduct"("scheme_type");

-- CreateIndex
CREATE INDEX "MfProduct_latest_nav_date_idx" ON "MfProduct"("latest_nav_date");

-- CreateIndex
CREATE INDEX "MfProduct_risk_level_idx" ON "MfProduct"("risk_level");

-- CreateIndex
CREATE INDEX "MfNavHistory_scheme_id_nav_date_idx" ON "MfNavHistory"("scheme_id", "nav_date");

-- CreateIndex
CREATE INDEX "MfNavHistory_mf_product_id_nav_date_idx" ON "MfNavHistory"("mf_product_id", "nav_date");

-- CreateIndex
CREATE UNIQUE INDEX "MfNavHistory_scheme_id_nav_date_key" ON "MfNavHistory"("scheme_id", "nav_date");

-- CreateIndex
CREATE UNIQUE INDEX "MfSchemeTransactionRules_mf_product_id_key" ON "MfSchemeTransactionRules"("mf_product_id");

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
ALTER TABLE "KycType" ADD CONSTRAINT "KycType_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfKycSession" ADD CONSTRAINT "MfKycSession_kyc_type_id_fkey" FOREIGN KEY ("kyc_type_id") REFERENCES "KycType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfKycIdentity" ADD CONSTRAINT "MfKycIdentity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfNavHistory" ADD CONSTRAINT "MfNavHistory_mf_product_id_fkey" FOREIGN KEY ("mf_product_id") REFERENCES "MfProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfSchemeTransactionRules" ADD CONSTRAINT "MfSchemeTransactionRules_mf_product_id_fkey" FOREIGN KEY ("mf_product_id") REFERENCES "MfProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
