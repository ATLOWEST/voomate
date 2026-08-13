CREATE TYPE "public"."read_connection_status" AS ENUM('pending', 'active', 'error', 'revoked');--> statement-breakpoint
CREATE TABLE "read_only_connection_secrets" (
	"connection_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"ciphertext" text NOT NULL,
	"key_version" text DEFAULT 'local-aes-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "read_only_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"endpoint_url" text NOT NULL,
	"endpoint_origin" text NOT NULL,
	"status" "read_connection_status" DEFAULT 'pending' NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_verified_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"last_error_code" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "read_only_invocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"conversation_id" uuid,
	"run_id" uuid,
	"capability" text NOT NULL,
	"status" "tool_audit_status" NOT NULL,
	"input_hash" text NOT NULL,
	"input_fields" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"output_fields" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"latency_ms" integer NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "read_only_connection_secrets" ADD CONSTRAINT "read_only_connection_secrets_connection_id_read_only_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."read_only_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_only_connection_secrets" ADD CONSTRAINT "read_only_connection_secrets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_only_connections" ADD CONSTRAINT "read_only_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_only_connections" ADD CONSTRAINT "read_only_connections_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_only_invocations" ADD CONSTRAINT "read_only_invocations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_only_invocations" ADD CONSTRAINT "read_only_invocations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_only_invocations" ADD CONSTRAINT "read_only_invocations_connection_id_read_only_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."read_only_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_only_invocations" ADD CONSTRAINT "read_only_invocations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "read_only_connection_secrets_organization_idx" ON "read_only_connection_secrets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "read_only_connections_organization_idx" ON "read_only_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "read_only_connections_agent_status_idx" ON "read_only_connections" USING btree ("agent_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "read_only_connections_agent_endpoint_idx" ON "read_only_connections" USING btree ("agent_id","endpoint_url");--> statement-breakpoint
CREATE INDEX "read_only_invocations_organization_created_idx" ON "read_only_invocations" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "read_only_invocations_connection_created_idx" ON "read_only_invocations" USING btree ("connection_id","created_at");