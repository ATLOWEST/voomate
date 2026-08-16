ALTER TABLE "usage_records" ADD COLUMN "run_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_records" ADD COLUMN "estimated_cost_micros_usd" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_records" ADD COLUMN "pricing_version" text DEFAULT 'unpriced' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "usage_records_run_kind_idx" ON "usage_records" USING btree ("organization_id","run_id","kind");