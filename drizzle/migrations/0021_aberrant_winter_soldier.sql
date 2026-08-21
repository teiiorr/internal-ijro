CREATE INDEX "activity_log_created_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_log_user_idx" ON "activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leaves_user_idx" ON "leaves" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leaves_status_idx" ON "leaves" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");