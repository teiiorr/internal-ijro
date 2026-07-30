CREATE TABLE "normative_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder" varchar(120),
	"file_url" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer,
	"file_mime_type" varchar(120),
	"uploaded_by_user_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "position_title" varchar(200);--> statement-breakpoint
ALTER TABLE "normative_documents" ADD CONSTRAINT "normative_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "normative_documents_folder_idx" ON "normative_documents" USING btree ("folder");