ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "lastContext" jsonb;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD COLUMN IF NOT EXISTS "timelineEvents" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD COLUMN IF NOT EXISTS "provider" varchar(20);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "picture" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accessToken" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "refreshToken" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "scopes" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" timestamp;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp;
