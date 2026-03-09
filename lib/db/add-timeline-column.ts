import { config } from "dotenv";
import postgres from "postgres";

config({
  path: ".env.local",
});

const addTimelineColumn = async () => {
  if (!process.env.POSTGRES_URL) {
    console.log("  POSTGRES_URL not defined, skipping migration");
    process.exit(0);
  }

  const sql = postgres(process.env.POSTGRES_URL, { max: 1 });

  try {
    console.log("⏳ Adding timelineEvents column...");

    // Add column if it doesn't exist
    await sql`
      ALTER TABLE "Message_v2"
      ADD COLUMN IF NOT EXISTS "timelineEvents" jsonb DEFAULT '[]'::jsonb
    `;

    // Add index for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS "idx_Message_v2_timeline_events"
      ON "Message_v2" USING GIN ("timelineEvents")
    `;

    console.log("✅ timelineEvents column added successfully");
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error(" Failed to add timelineEvents column");
    console.error(err);
    await sql.end();
    process.exit(1);
  }
};

addTimelineColumn();
