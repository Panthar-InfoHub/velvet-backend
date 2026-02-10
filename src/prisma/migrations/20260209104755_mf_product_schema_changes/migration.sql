-- AlterTable
ALTER TABLE "MfProduct" ALTER COLUMN "isin_growth" DROP NOT NULL,
ALTER COLUMN "isin_div_reinvestment" DROP NOT NULL,
ALTER COLUMN "latest_nav" DROP NOT NULL,
ALTER COLUMN "latest_nav" SET DATA TYPE TEXT;
