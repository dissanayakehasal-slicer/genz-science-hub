-- Role row for Vercel env-only admin (ADMIN_USER_ID default in auth.ts).
INSERT INTO public.user_roles (user_id, role)
VALUES ('a0000000-0000-4000-8000-000000000001'::uuid, 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
