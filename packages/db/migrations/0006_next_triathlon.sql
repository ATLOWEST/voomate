CREATE TYPE "public"."web_agent_image_status" AS ENUM('pending', 'processed', 'consumed', 'rejected', 'deleted');--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'image_input_tokens' BEFORE 'tts_characters';--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'image_upload_bytes' BEFORE 'tts_characters';--> statement-breakpoint
CREATE TABLE "web_agent_image_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"conversation_id" uuid,
	"message_id" uuid,
	"session_fingerprint" text NOT NULL,
	"quarantine_path" text NOT NULL,
	"processed_path" text,
	"status" "web_agent_image_status" DEFAULT 'pending' NOT NULL,
	"source_bytes" integer,
	"processed_bytes" integer,
	"source_format" text,
	"processed_format" text,
	"width" integer,
	"height" integer,
	"source_sha256" text,
	"rejection_reason" text,
	"finalize_before" timestamp with time zone NOT NULL,
	"purge_after" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "web_agent_image_uploads" ADD CONSTRAINT "web_agent_image_uploads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_agent_image_uploads" ADD CONSTRAINT "web_agent_image_uploads_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_agent_image_uploads" ADD CONSTRAINT "web_agent_image_uploads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_agent_image_uploads" ADD CONSTRAINT "web_agent_image_uploads_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "web_agent_image_uploads_organization_idx" ON "web_agent_image_uploads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "web_agent_image_uploads_agent_idx" ON "web_agent_image_uploads" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "web_agent_image_uploads_session_created_idx" ON "web_agent_image_uploads" USING btree ("session_fingerprint","created_at");--> statement-breakpoint
CREATE INDEX "web_agent_image_uploads_purge_idx" ON "web_agent_image_uploads" USING btree ("purge_after");