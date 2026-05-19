/**
 * Apply vercel/schema.sql to Vercel Postgres (Neon).
 * Usage: POSTGRES_URL=... node scripts/setup-vercel-db.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { loadDotenv } from "./load-dotenv.mjs";

loadDotenv();

const url =
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error("Set POSTGRES_URL or DATABASE_URL");
  process.exit(1);
}

const schema = readFileSync(resolve("vercel/schema.sql"), "utf8");
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

await client.connect();
console.log("Connected. Applying schema...");
await client.query(schema);
await client.end();
console.log("Done. Run: npm run bootstrap-admin");
