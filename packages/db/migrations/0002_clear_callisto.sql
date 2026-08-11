CREATE TYPE "public"."integration_status" AS ENUM('active', 'disconnected');--> statement-breakpoint
CREATE TABLE "organization_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"credentials" jsonb NOT NULL,
	"status" "integration_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_integrations" ADD CONSTRAINT "organization_integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_integrations_org_idx" ON "organization_integrations" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_integrations_org_provider_idx" ON "organization_integrations" USING btree ("organization_id","provider");