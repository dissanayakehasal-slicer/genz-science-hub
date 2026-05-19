/**
 * Create/update hasal admin for Auth.js (app_auth_users + super_admin role).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run bootstrap-admin
 */
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { loadDotenv } from "./load-dotenv.mjs";

loadDotenv();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "Hasal@2011";
const username = "hasal";

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Get them from Supabase → Project Settings → API, add to .env, then rerun."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const password_hash = await bcrypt.hash(password, 12);

const { data: existing, error: findErr } = await admin
  .from("app_auth_users")
  .select("id")
  .eq("username", username)
  .maybeSingle();

if (findErr) {
  console.error(findErr.message);
  console.error("\nRun supabase migrations first (app_auth_users table).");
  process.exit(1);
}

let userId;

if (existing) {
  const { error } = await admin
    .from("app_auth_users")
    .update({ password_hash })
    .eq("id", existing.id);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  userId = existing.id;
  console.log("Updated password for:", username);
} else {
  const { data: created, error } = await admin
    .from("app_auth_users")
    .insert({ username, password_hash })
    .select("id")
    .single();
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  userId = created.id;
  console.log("Created user:", username);
}

await admin.from("user_roles").delete().eq("user_id", userId);
const { error: roleErr } = await admin
  .from("user_roles")
  .insert({ user_id: userId, role: "super_admin" });
if (roleErr) {
  console.error(roleErr.message);
  process.exit(1);
}

console.log("super_admin role assigned.");
console.log("Login on Vercel with username:", username, "password:", password);
console.log("Ensure AUTH_SECRET and SUPABASE_JWT_SECRET are set on Vercel.");
