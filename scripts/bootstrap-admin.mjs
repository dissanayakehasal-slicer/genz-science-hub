/**
 * Sync hasal super-admin via Supabase Auth Admin API (works when SQL crypt() logins fail).
 *
 * Usage (from project root):
 *   set SUPABASE_URL=https://xxx.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/bootstrap-admin.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadDotenv } from "./load-dotenv.mjs";

loadDotenv();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "Hasal@2011";
const email = "hasal@gmszcience.local";
const username = "hasal";

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Supabase Dashboard → Project Settings → API → service_role (secret).\n" +
      "Add to .env or run:\n" +
      '  $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."\n' +
      "  npm run bootstrap-admin\n" +
      "\nOr create the user manually: Authentication → Users → Add user\n" +
      "  Email: hasal@gmszcience.local  Password: Hasal@2011  (auto-confirm)\n" +
      "Then run scripts/grant-hasal-admin.sql in SQL Editor."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
if (listErr) {
  console.error(listErr.message);
  process.exit(1);
}

const existing = listed.users.find((u) => u.email === email);
let userId;

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  userId = existing.id;
  console.log("Updated password for existing user:", email);
} else {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  userId = created.user.id;
  console.log("Created user:", email);
}

await admin.from("user_roles").delete().eq("user_id", userId);
const { error: roleErr } = await admin
  .from("user_roles")
  .insert({ user_id: userId, role: "super_admin" });
if (roleErr) {
  console.error(roleErr.message);
  process.exit(1);
}

console.log("super_admin role assigned. Login with username hasal and your password.");
