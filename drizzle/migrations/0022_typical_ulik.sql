CREATE TABLE "project_curators" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "project_curators_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "project_curators" ADD CONSTRAINT "project_curators_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_curators" ADD CONSTRAINT "project_curators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_curators_project_idx" ON "project_curators" USING btree ("project_id");--> statement-breakpoint
-- Backfill: seed the join table from the existing single curator column.
INSERT INTO "project_curators" ("project_id", "user_id")
SELECT "id", "curator_user_id" FROM "projects" WHERE "curator_user_id" IS NOT NULL
ON CONFLICT DO NOTHING;