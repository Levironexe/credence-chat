ALTER TABLE "Chat" ADD COLUMN "lastContext" jsonb;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD COLUMN "timelineEvents" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "Message_v2" ADD COLUMN "provider" varchar(20);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "googleId" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "picture" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "accessToken" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "refreshToken" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "tokenExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "scopes" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "createdAt" timestamp;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "updatedAt" timestamp;