/**
 * Create/update hasal admin in Vercel Postgres.
 * Usage: POSTGRES_URL=... node scripts/bootstrap-admin.mjs
 */
import bcrypt from "bcryptjs";
import pg from "pg";
import { loadDotenv } from "./load-dotenv.mjs";

loadDotenv();

const url =
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL_NON_POOLING;

const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "Hasal@2011";
const username = "hasal";

if (!url) {
  console.error("Set POSTGRES_URL or DATABASE_URL (from Vercel → Storage → Neon).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const password_hash = await bcrypt.hash(password, 12);

const existing = await client.query(
  `SELECT id FROM app_auth_users WHERE username = $1`,
  [username]
);

let userId;
if (existing.rows[0]) {
  userId = existing.rows[0].id;
  await client.query(`UPDATE app_auth_users SET password_hash = $1 WHERE id = $2`, [
    password_hash,
    userId,
  ]);
  console.log("Updated password for:", username);
} else {
  const ins = await client.query(
    `INSERT INTO app_auth_users (username, password_hash) VALUES ($1, $2) RETURNING id`,
    [username, password_hash]
  );
  userId = ins.rows[0].id;
  console.log("Created user:", username);
}

await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
await client.query(
  `INSERT INTO user_roles (user_id, role) VALUES ($1, 'super_admin') ON CONFLICT DO NOTHING`,
  [userId]
);

await client.end();
console.log("super_admin role assigned.");
