ALTER TABLE "external_companies" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "project_messages" ADD COLUMN "stage_id" uuid;--> statement-breakpoint
ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_stage_id_project_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."project_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_messages_stage_idx" ON "project_messages" USING btree ("project_id","stage_id");