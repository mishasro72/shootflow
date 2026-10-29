-- Structural guarantees: RLS everywhere, no anonymous access, status not writable.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

select is(
  (select count(*)::integer from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'every public table has row level security enabled'
);

select is(
  (select string_agg(tablename, ', ' order by tablename) from pg_tables where schemaname = 'public' and not rowsecurity),
  null,
  'no table is missing RLS (names listed on failure)'
);

select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'
  ),
  0,
  'the anon role has no privileges on any public table'
);

select ok(
  not has_column_privilege('authenticated', 'public.projects', 'status', 'UPDATE'),
  'signed-in users cannot update projects.status directly'
);

select ok(
  not has_column_privilege('authenticated', 'public.projects', 'access_token', 'UPDATE'),
  'signed-in users cannot set the portal access token'
);

select ok(
  not has_table_privilege('authenticated', 'public.notification_outbox', 'SELECT'),
  'notification_outbox is server-only'
);

select ok(
  not has_table_privilege('authenticated', 'public.link_codes', 'SELECT'),
  'link_codes is server-only'
);

select is(
  (select count(*)::integer from public.plans where code = 'free'),
  1,
  'the free plan exists'
);

select * from finish();
rollback;
