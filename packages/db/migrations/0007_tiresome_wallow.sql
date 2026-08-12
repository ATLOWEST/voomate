ALTER TYPE "public"."knowledge_source_type" ADD VALUE 'api_sync';--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'embedding_input_tokens' BEFORE 'tts_characters';--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "scopes" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_agent_idx" ON "api_keys" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_documents_source_external_idx" ON "knowledge_documents" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_sources_external_idx" ON "knowledge_sources" USING btree ("organization_id","agent_id","type","external_id");