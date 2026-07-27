CREATE TABLE "council_agenda_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"topic" varchar(500) NOT NULL,
	"project_id" uuid,
	"presenter_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "council_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(10) NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"title" varchar(255),
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "council_agenda_items" ADD CONSTRAINT "council_agenda_items_meeting_id_council_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."council_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "council_agenda_items" ADD CONSTRAINT "council_agenda_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "council_agenda_items" ADD CONSTRAINT "council_agenda_items_presenter_user_id_users_id_fk" FOREIGN KEY ("presenter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "council_meetings" ADD CONSTRAINT "council_meetings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "council_agenda_items_meeting_idx" ON "council_agenda_items" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "council_meetings_kind_idx" ON "council_meetings" USING btree ("kind","scheduled_at");