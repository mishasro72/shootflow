-- Sign-up provisioning: profile, studio on the free plan, OWNER membership.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'maria@example.test', '{"name":"Maria K","locale":"ru"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'john.doe@example.test', '{}');

select is(
  (select name from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
  'Maria K',
  'the profile takes the name given at sign-up'
);

select is(
  (select locale from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
  'ru',
  'the profile takes the language chosen at sign-up'
);

select is(
  (select name from public.profiles where id = '00000000-0000-0000-0000-0000000000c2'),
  'john.doe',
  'without a name the email prefix is used'
);

select is(
  (select locale from public.profiles where id = '00000000-0000-0000-0000-0000000000c2'),
  'en',
  'the language defaults to English'
);

select is(
  (select count(*)::integer from public.workspace_members where user_id = '00000000-0000-0000-0000-0000000000c1'),
  1,
  'a new photographer belongs to exactly one workspace'
);

select is(
  (select role from public.workspace_members where user_id = '00000000-0000-0000-0000-0000000000c1'),
  'OWNER'::public.workspace_role,
  'and owns it'
);

select is(
  (
    select p.code
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    join public.plans p on p.id = w.plan_id
    where m.user_id = '00000000-0000-0000-0000-0000000000c1'
  ),
  'free',
  'the workspace is on the free plan'
);

select isnt(
  (select workspace_id from public.workspace_members where user_id = '00000000-0000-0000-0000-0000000000c1'),
  (select workspace_id from public.workspace_members where user_id = '00000000-0000-0000-0000-0000000000c2'),
  'two photographers get two different workspaces'
);

-- A new photographer sees their empty workspace through RLS.
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::integer from public.workspaces), 1, 'the new photographer sees one workspace');
select is((select count(*)::integer from public.projects), 0, 'and no projects');

reset role;

update auth.users set email = 'maria.new@example.test' where id = '00000000-0000-0000-0000-0000000000c1';
select is(
  (select email from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
  'maria.new@example.test',
  'an email change in auth is copied to the profile'
);

select * from finish();
rollback;
