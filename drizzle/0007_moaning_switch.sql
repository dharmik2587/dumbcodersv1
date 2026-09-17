CREATE TABLE "career_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"portfolio_url" text,
	"github_url" text,
	"linkedin_url" text,
	"resume_url" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"email" text,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"page_url" text,
	"user_agent" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "career_applications" ADD CONSTRAINT "career_applications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_reports" ADD CONSTRAINT "problem_reports_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "career_applications_status_idx" ON "career_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "career_applications_role_idx" ON "career_applications" USING btree ("role");--> statement-breakpoint
CREATE INDEX "career_applications_created_at_idx" ON "career_applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "problem_reports_status_idx" ON "problem_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "problem_reports_user_idx" ON "problem_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "problem_reports_created_at_idx" ON "problem_reports" USING btree ("created_at");