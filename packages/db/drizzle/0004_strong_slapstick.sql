CREATE TABLE "chat_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"outcome" text DEFAULT 'answered' NOT NULL,
	"faq_hits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_logs_created_at_idx" ON "chat_logs" USING btree ("created_at");