CREATE TABLE "project_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"template_item_id" uuid,
	"order_index" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'locked' NOT NULL,
	"planned_deadline" date,
	"planned_amount" numeric(15, 2),
	"responsible_user_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"reminder_approaching_sent_at" timestamp with time zone,
	"reminder_overdue_sent_at" timestamp with time zone,
	"reminder_stale_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"name_uz_latn" varchar(255) NOT NULL,
	"name_uz_cyrl" varchar(255) NOT NULL,
	"name_ru" varchar(255) NOT NULL,
	"stage_template_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer,
	"file_mime_type" varchar(120),
	"uploaded_by_user_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'UZS' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"note" varchar(500),
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"name_uz_latn" varchar(255) NOT NULL,
	"name_uz_cyrl" varchar(255) NOT NULL,
	"name_ru" varchar(255) NOT NULL,
	"default_duration_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"name_uz_latn" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "project_type_id" uuid;--> statement-breakpoint
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_template_item_id_stage_template_items_id_fk" FOREIGN KEY ("template_item_id") REFERENCES "public"."stage_template_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_types" ADD CONSTRAINT "project_types_stage_template_id_stage_templates_id_fk" FOREIGN KEY ("stage_template_id") REFERENCES "public"."stage_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_documents" ADD CONSTRAINT "stage_documents_stage_id_project_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."project_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_documents" ADD CONSTRAINT "stage_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_payments" ADD CONSTRAINT "stage_payments_stage_id_project_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."project_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_payments" ADD CONSTRAINT "stage_payments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_template_items" ADD CONSTRAINT "stage_template_items_template_id_stage_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."stage_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_stages_project_idx" ON "project_stages" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_stages_order_uniq" ON "project_stages" USING btree ("project_id","order_index");--> statement-breakpoint
CREATE INDEX "project_stages_status_idx" ON "project_stages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_stages_responsible_idx" ON "project_stages" USING btree ("responsible_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_types_code_uniq" ON "project_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "stage_documents_stage_idx" ON "stage_documents" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "stage_payments_stage_idx" ON "stage_payments" USING btree ("stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_template_items_order_uniq" ON "stage_template_items" USING btree ("template_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_templates_code_uniq" ON "stage_templates" USING btree ("code");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_type_id_project_types_id_fk" FOREIGN KEY ("project_type_id") REFERENCES "public"."project_types"("id") ON DELETE set null ON UPDATE no action;