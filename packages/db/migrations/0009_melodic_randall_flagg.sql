DROP INDEX "agent_turn_evaluations_message_policy_idx";--> statement-breakpoint
ALTER TABLE "agent_turn_evaluations" ADD COLUMN "evaluator_version" text;--> statement-breakpoint
UPDATE "agent_turn_evaluations" SET "evaluator_version" = 'legacy-nova-judge-v1';--> statement-breakpoint
ALTER TABLE "agent_turn_evaluations" ALTER COLUMN "evaluator_version" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_turn_evaluations_message_policy_evaluator_idx" ON "agent_turn_evaluations" USING btree ("message_id","policy_version","evaluator_version");
