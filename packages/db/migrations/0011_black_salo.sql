ALTER TYPE "public"."usage_kind" ADD VALUE 'agent_runs';--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'model_invocations';--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'knowledge_queries';--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'live_read_calls';--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'tool_calls';--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'tool_failures';--> statement-breakpoint
ALTER TYPE "public"."usage_kind" ADD VALUE 'response_guard_interventions';