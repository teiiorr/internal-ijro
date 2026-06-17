ALTER TABLE "milestones" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status_override" varchar(20);--> statement-breakpoint
-- Backfill stage progress from legacy status enum
UPDATE "milestones" SET "progress" = 100 WHERE "status" = 'completed';--> statement-breakpoint
UPDATE "milestones" SET "progress" = 50  WHERE "status" = 'in_progress';--> statement-breakpoint
-- Sanity constraints
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_progress_range" CHECK ("progress" BETWEEN 0 AND 100);--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_weight_positive" CHECK ("weight" > 0);