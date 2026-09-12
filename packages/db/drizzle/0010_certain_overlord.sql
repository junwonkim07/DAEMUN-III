CREATE TABLE "resolution_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"resolution_id" text NOT NULL,
	"document" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resolution_versions" ADD CONSTRAINT "resolution_versions_resolution_id_resolutions_id_fk" FOREIGN KEY ("resolution_id") REFERENCES "public"."resolutions"("id") ON DELETE cascade ON UPDATE no action;