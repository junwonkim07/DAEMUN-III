CREATE TABLE "telemetry_events" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"page_path" text NOT NULL,
	"document_path" text,
	"release" text,
	"sentry_event_id" text,
	"user_agent" text,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "telemetry_events_created_at_idx" ON "telemetry_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "telemetry_events_session_created_idx" ON "telemetry_events" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "telemetry_events_type_created_idx" ON "telemetry_events" USING btree ("type","created_at");