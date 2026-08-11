CREATE TABLE "agent_connections" (
	"organization_id" uuid NOT NULL,
	"source_agent_id" uuid NOT NULL,
	"target_agent_id" uuid NOT NULL,
	"connection_type" text DEFAULT 'handoff' NOT NULL,
	"status" "agent_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_connections_source_agent_id_target_agent_id_pk" PRIMARY KEY("source_agent_id","target_agent_id")
);
--> statement-breakpoint
ALTER TABLE "agent_connections" ADD CONSTRAINT "agent_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_connections" ADD CONSTRAINT "agent_connections_source_agent_id_agents_id_fk" FOREIGN KEY ("source_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_connections" ADD CONSTRAINT "agent_connections_target_agent_id_agents_id_fk" FOREIGN KEY ("target_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_connections_organization_idx" ON "agent_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "agent_connections_target_idx" ON "agent_connections" USING btree ("target_agent_id");