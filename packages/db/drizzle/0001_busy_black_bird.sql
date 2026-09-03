ALTER TABLE "user" ADD COLUMN "grade" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "committee" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "mun_experience" text;--> statement-breakpoint
UPDATE "user" SET "email_verified" = true WHERE "role" = 'admin';
