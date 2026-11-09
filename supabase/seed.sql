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

-- A small board: a look with a note inside, a section, a palette and a private note.
insert into public.board_items (id, project_id, workspace_id, kind, group_role, group_color, title, body, sort_order, technique_note) values
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'GROUP', 'LOOK', '#e8dcc8', 'White linen dress', 'Plus gold jewelry.', 1, '85mm, f/2, backlight'),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'GROUP', 'SECTION', null, 'Poses', null, 2, null);
insert into public.board_items (project_id, workspace_id, kind, parent_id, title, body, payload, sort_order, visibility) values
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'NOTE', '44444444-4444-4444-4444-444444444401', 'Hair', 'Loose waves, no hairspray.', '{}', 1, 'EVERYONE'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'NOTE', '44444444-4444-4444-4444-444444444402', 'Walking shot', 'Candid movement through the grass.', '{}', 1, 'EVERYONE'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'PALETTE', null, 'Sunset field', null, '{"colors": ["#f2c46d", "#e07a5f", "#81b29a", "#3d405b"]}', 3, 'EVERYONE'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'NOTE', null, 'Parking', 'Gate code 4512.', '{}', 4, 'PRIVATE');

-- The demo studio's kit; the 85mm is chosen for the look and lands in the packing list.
insert into public.gear_items (id, workspace_id, kind, name, sort_order) values
  ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222222', 'CAMERA', 'Canon R6 Mark II', 1),
  ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222222', 'LENS', 'RF 85mm f/1.2', 2),
  ('55555555-5555-5555-5555-555555555503', '22222222-2222-2222-2222-222222222222', 'MODIFIER', 'Reflector 5-in-1', 3);
insert into public.board_item_gear (board_item_id, gear_id, project_id, workspace_id)
values ('44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222');

-- Move the demo project out of DRAFT through the only allowed path.
select public.transition_project_status('33333333-3333-3333-3333-333333333333', 'PLANNING');
