-- Super admin login: username `hasal` / password `Hasal@2011` (email: hasal@gmszcience.local)
DO $$
DECLARE new_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'hasal@gmszcience.local') THEN
    UPDATE auth.users
    SET
      encrypted_password = crypt('Hasal@2011', gen_salt('bf')),
      updated_at = now()
    WHERE email = 'hasal@gmszcience.local';
  ELSE
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
