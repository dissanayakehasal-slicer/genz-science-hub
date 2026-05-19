
-- helper: super admin check
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'super_admin') $$;

-- treat super_admins as admins everywhere
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') $$;

-- RLS: super admins fully manage user_roles. admins read all (to see who is who).
DROP POLICY IF EXISTS "super admins manage roles" ON public.user_roles;
CREATE POLICY "super admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "admins read roles" ON public.user_roles;
CREATE POLICY "admins read roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin());

-- Update first-admin trigger to make the first user a super_admin
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_first_admin();

-- Branding: GMS not GSM
ALTER TABLE public.site_settings ALTER COLUMN teacher_short_name SET DEFAULT 'GMS';
UPDATE public.site_settings SET teacher_short_name = 'GMS' WHERE teacher_short_name = 'GSM' OR teacher_short_name IS NULL;

-- Seed initial super admin: username `hasal` / pw `Hasal@2011`
-- (stored as hasal@gmszcience.local because Supabase auth requires email)
DO $$
DECLARE new_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'hasal@gmszcience.local') THEN
    new_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
      'hasal@gmszcience.local', crypt('Hasal@2011', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"],"username":"hasal"}'::jsonb,
      '{"username":"hasal"}'::jsonb,
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_id, jsonb_build_object('sub', new_id::text, 'email', 'hasal@gmszcience.local'), 'email', new_id::text, now(), now(), now());
    INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
