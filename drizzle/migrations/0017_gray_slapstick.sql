ALTER TABLE "project_stages" ADD COLUMN "contract_number" varchar(50) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "contract_number";