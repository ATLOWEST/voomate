CREATE TYPE "public"."knowledge_gap_status" AS ENUM('open', 'drafted', 'answered', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."tool_audit_status" AS ENUM('success', 'error', 'gated');--> statement-breakpoint
CREATE TYPE "public"."tool_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TABLE "agent_active_tools" (
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"tool_name" text NOT NULL,
	"status" "tool_status" DEFAULT 'active' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_active_tools_agent_id_tool_name_pk" PRIMARY KEY("agent_id","tool_name")
);
--> statement-breakpoint
CREATE TABLE "knowledge_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"question" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"language" text,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"status" "knowledge_gap_status" DEFAULT 'open' NOT NULL,
	"draft_answer" text,
	"resolved_document_id" uuid,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"conversation_id" uuid,
	"tool_name" text NOT NULL,
	"status" "tool_audit_status" NOT NULL,
	"inputs" jsonb NOT NULL,
	"result" jsonb,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "grounding" jsonb;--> statement-breakpoint
ALTER TABLE "agent_active_tools" ADD CONSTRAINT "agent_active_tools_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_active_tools" ADD CONSTRAINT "agent_active_tools_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_gaps" ADD CONSTRAINT "knowledge_gaps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_gaps" ADD CONSTRAINT "knowledge_gaps_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_gaps" ADD CONSTRAINT "knowledge_gaps_resolved_document_id_knowledge_documents_id_fk" FOREIGN KEY ("resolved_document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_audit_logs" ADD CONSTRAINT "tool_audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_audit_logs" ADD CONSTRAINT "tool_audit_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_audit_logs" ADD CONSTRAINT "tool_audit_logs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_active_tools_organization_idx" ON "agent_active_tools" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "knowledge_gaps_organization_idx" ON "knowledge_gaps" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "knowledge_gaps_agent_status_idx" ON "knowledge_gaps" USING btree ("agent_id","status","occurrences");--> statement-breakpoint
CREATE INDEX "tool_audit_logs_organization_idx" ON "tool_audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tool_audit_logs_conversation_idx" ON "tool_audit_logs" USING btree ("conversation_id");