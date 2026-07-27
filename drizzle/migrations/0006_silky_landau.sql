ALTER TABLE "stage_documents" ADD COLUMN "category" varchar(120);--> statement-breakpoint
CREATE INDEX "stage_documents_category_idx" ON "stage_documents" USING btree ("stage_id","category");