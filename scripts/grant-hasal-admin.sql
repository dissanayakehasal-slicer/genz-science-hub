-- Run in Supabase → SQL Editor AFTER creating the auth user in Dashboard:
-- Authentication → Users → Add user
--   Email: hasal@gmszcience.local
--   Password: Hasal@2011
--   ✓ Auto confirm user

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM auth.users
WHERE email = 'hasal@gmszcience.local'
ON CONFLICT (user_id, role) DO NOTHING;
