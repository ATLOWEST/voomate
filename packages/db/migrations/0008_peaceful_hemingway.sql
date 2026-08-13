CREATE TYPE "public"."message_feedback_rating" AS ENUM('helpful', 'unhelpful');--> statement-breakpoint
CREATE TABLE "agent_turn_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"policy_version" text NOT NULL,
	"evaluator_model" text NOT NULL,
	"overall_score" real NOT NULL,
	"dimensions" jsonb NOT NULL,
	"flags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"session_fingerprint" text NOT NULL,
	"rating" "message_feedback_rating" NOT NULL,
	"reason" text,
	"rlaif_score" real,
	"rlaif_dimensions" jsonb,
	"evaluator_model" text,
	"policy_version" text NOT NULL,
	"evaluated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_turn_evaluations" ADD CONSTRAINT "agent_turn_evaluations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_turn_evaluations" ADD CONSTRAINT "agent_turn_evaluations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_turn_evaluations" ADD CONSTRAINT "agent_turn_evaluations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_turn_evaluations" ADD CONSTRAINT "agent_turn_evaluations_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_turn_evaluations_message_policy_idx" ON "agent_turn_evaluations" USING btree ("message_id","policy_version");--> statement-breakpoint
CREATE INDEX "agent_turn_evaluations_organization_idx" ON "agent_turn_evaluations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agent_turn_evaluations_agent_created_idx" ON "agent_turn_evaluations" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "message_feedback_message_session_idx" ON "message_feedback" USING btree ("message_id","session_fingerprint");--> statement-breakpoint
CREATE INDEX "message_feedback_organization_idx" ON "message_feedback" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "message_feedback_agent_created_idx" ON "message_feedback" USING btree ("agent_id","created_at");