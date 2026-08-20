CREATE TYPE "public"."agent_connection_status" AS ENUM('active', 'paused', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."business_profile_review_state" AS ENUM('observed', 'proposed', 'approved', 'rejected', 'retired');--> statement-breakpoint
CREATE TYPE "public"."business_profile_status" AS ENUM('proposed', 'approved', 'rejected', 'retired');--> statement-breakpoint
CREATE TABLE "business_profile_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"profile_version_id" uuid NOT NULL,
	"section" text NOT NULL,
	"source_type" text NOT NULL,
	"source_reference" text NOT NULL,
	"confidence" real NOT NULL,
	"inference_version" text NOT NULL,
	"review_state" "business_profile_review_state" DEFAULT 'proposed' NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profile_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"status" "business_profile_status" DEFAULT 'proposed' NOT NULL,
	"profile" jsonb NOT NULL,
	"change_summary" text NOT NULL,
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
ALTER TABLE "agent_connections" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "agent_connections" ALTER COLUMN "status" SET DATA TYPE text USING "status"::text;--> statement-breakpoint
UPDATE "agents" SET "status" = 'active' WHERE "status" = 'published';--> statement-breakpoint
UPDATE "agent_connections" SET "status" = 'active' WHERE "status" = 'published';--> statement-breakpoint
DROP TYPE "public"."agent_status";--> statement-breakpoint
CREATE TYPE "public"."agent_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."agent_status";--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "status" SET DATA TYPE "public"."agent_status" USING "status"::"public"."agent_status";--> statement-breakpoint
ALTER TABLE "agent_connections" ALTER COLUMN "status" SET DATA TYPE "public"."agent_connection_status" USING "status"::"public"."agent_connection_status";--> statement-breakpoint
ALTER TABLE "agent_connections" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "catalog_type" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "catalog_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "desired_state_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "observed_state_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "execution_lease_id" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "execution_lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "business_profile_version_id" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
UPDATE "agents"
SET "execution_lease_id" = gen_random_uuid(),
    "execution_lease_expires_at" = now() + interval '20 minutes'
WHERE "status" = 'active';--> statement-breakpoint
ALTER TABLE "business_profile_evidence" ADD CONSTRAINT "business_profile_evidence_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profile_evidence" ADD CONSTRAINT "business_profile_evidence_profile_version_id_business_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."business_profile_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profile_versions" ADD CONSTRAINT "business_profile_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profile_versions" ADD CONSTRAINT "business_profile_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profile_versions" ADD CONSTRAINT "business_profile_versions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_profile_evidence_org_idx" ON "business_profile_evidence" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "business_profile_evidence_version_idx" ON "business_profile_evidence" USING btree ("profile_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_profile_versions_org_revision_idx" ON "business_profile_versions" USING btree ("organization_id","revision");--> statement-breakpoint
CREATE INDEX "business_profile_versions_org_status_idx" ON "business_profile_versions" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_business_profile_version_id_business_profile_versions_id_fk" FOREIGN KEY ("business_profile_version_id") REFERENCES "public"."business_profile_versions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_profile_versions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "business_profile_versions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "business_profile_evidence" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "business_profile_evidence" FORCE ROW LEVEL SECURITY;
