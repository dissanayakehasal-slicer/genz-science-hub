import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadDotenv } from "./load-dotenv.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv();

const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set POSTGRES_URL or DATABASE_URL");
  process.exit(1);
}

const sql = readFileSync(resolve(__dirname, "../vercel/migrations/001_online_classes.sql"), "utf8");
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  await client.query(sql);
  console.log("Online Classes migration applied.");
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
