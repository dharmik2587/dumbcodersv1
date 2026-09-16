ALTER TABLE "direct_messages" ADD COLUMN "client_message_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "direct_messages_client_message_unique_idx" ON "direct_messages" USING btree ("conversation_id","client_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_requests_pending_unique_idx" ON "team_requests" USING btree ("from_user_id","to_user_id") WHERE status = 'pending';