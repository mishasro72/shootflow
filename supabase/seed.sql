-- Local development data. Applied by `supabase db reset` / `supabase start`; never in production.
--
-- Sign in as demo@shootflow.test / shootflow-demo once sign-in exists (step 3).

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'demo@shootflow.test',
  extensions.crypt('shootflow-demo', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"provision":false}',
  '{"name":"Demo Photographer"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'email',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"demo@shootflow.test","email_verified":true}',
  now(), now(), now()
);

insert into public.profiles (id, name, email, locale, timezone)
values ('11111111-1111-1111-1111-111111111111', 'Demo Photographer', 'demo@shootflow.test', 'ru', 'America/New_York');

insert into public.workspaces (id, name, plan_id, default_locale, brand_name, watermark_text)
select '22222222-2222-2222-2222-222222222222', 'Demo Studio', id, 'en', 'Demo Studio', 'Demo Studio · proof'
from public.plans where code = 'free';

insert into public.workspace_members (workspace_id, user_id, role)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'OWNER');

insert into public.projects (
  id, workspace_id, title, shoot_start, shoot_end, timezone,
  location_name, location_address, location_lat, location_lng,
  notes, client_locale, retouch_limit
) values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Golden hour portraits',
  -- 17:00-19:00 local time in Raleigh, a week from today.
  (date_trunc('day', now() at time zone 'America/New_York') + interval '7 days 17 hours') at time zone 'America/New_York',
  (date_trunc('day', now() at time zone 'America/New_York') + interval '7 days 19 hours') at time zone 'America/New_York',
  'America/New_York',
  'Dix Park',
  '1030 Richardson Dr, Raleigh, NC 27603',
  35.7667, -78.6521,
  'Meet by the sunflower field parking lot.',
  'en',
  10
);

insert into public.project_clients (project_id, workspace_id, name, email)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Anna', 'anna@example.test');

insert into public.concept_items (project_id, workspace_id, category, title, description, status, sort_order) values
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'MOODBOARD', 'Backlit field', 'Sun behind the model, soft flare.', 'APPROVED', 1),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'MOODBOARD', 'Walking shot', 'Candid movement through the grass.', 'PENDING', 2),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'WARDROBE', 'White linen dress', 'Plus gold jewelry.', 'APPROVED', 1),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'WARDROBE', 'Red coat', null, 'CHANGES_REQUESTED', 2),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'EQUIPMENT', '85mm f/1.4', null, 'PENDING', 1),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'EQUIPMENT', 'Reflector', null, 'PENDING', 2);

-- Move the demo project out of DRAFT through the only allowed path.
select public.transition_project_status('33333333-3333-3333-3333-333333333333', 'PLANNING');
