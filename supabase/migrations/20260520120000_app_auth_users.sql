-- App-managed admin credentials (Auth.js / Vercel). Supabase Auth is no longer required for login.
CREATE TABLE IF NOT EXISTS public.app_auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_auth_users ENABLE ROW LEVEL SECURITY;

-- No public policies: only service role (server) accesses this table.

-- Allow user_roles to reference app users (in addition to legacy auth.users rows).
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
