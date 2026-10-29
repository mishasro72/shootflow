-- ShootFlow core schema: tenants, projects, pre-production, shoot day, proofing,
-- notifications. Row Level Security is enabled on every table in this migration.
--
-- Tenancy: every row that belongs to a photographer carries workspace_id. Child rows
-- copy it from their project in a trigger, so policies never need joins.

-- ---------------------------------------------------------------------------
-- Schemas and helpers
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Enumerations ---------------------------------------------------------------

create type public.workspace_role as enum ('OWNER', 'ASSISTANT');

create type public.project_status as enum (
  'DRAFT',
  'PLANNING',
  'SHOOT_DAY',
  'PROOFING',
  'SELECTION_SUBMITTED',
  'RETOUCHING',
  'DELIVERED',
  'COMPLETED'
);

create type public.concept_category as enum ('MOODBOARD', 'WARDROBE', 'EQUIPMENT');
create type public.concept_status as enum ('PENDING', 'APPROVED', 'CHANGES_REQUESTED');
create type public.shot_status as enum ('PENDING', 'SHOT', 'REJECTED');
create type public.author_type as enum ('PHOTOGRAPHER', 'CLIENT');
create type public.actor_type as enum ('PHOTOGRAPHER', 'CLIENT', 'SYSTEM');
create type public.selection_type as enum ('INCLUDED', 'EXTRA');
create type public.retouch_order_status as enum ('PENDING', 'PAID', 'CANCELLED');
create type public.recipient_type as enum ('PHOTOGRAPHER', 'CLIENT');
create type public.notification_channel as enum ('TELEGRAM', 'EMAIL');
create type public.outbox_status as enum ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- Generic triggers -------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Copies workspace_id from the parent project so it can never disagree with it.
create function private.set_workspace_from_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select p.workspace_id into v_workspace_id
  from public.projects p
  where p.id = new.project_id;

  if v_workspace_id is null then
    raise exception 'project % does not exist', new.project_id
      using errcode = 'foreign_key_violation';
  end if;

  new.workspace_id := v_workspace_id;
  return new;
end;
$$;

-- A URL-safe random token: 32 random bytes as base64url without padding (43 chars).
create function private.random_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
$$;

-- ---------------------------------------------------------------------------
-- Plans, workspaces, people
-- ---------------------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  max_active_projects integer not null check (max_active_projects > 0),
  max_storage_bytes bigint not null check (max_storage_bytes > 0),
  max_photos_per_project integer not null check (max_photos_per_project > 0),
  created_at timestamptz not null default now()
);

comment on table public.plans is 'Pricing tiers and their quotas. MVP ships a single free plan.';

insert into public.plans (code, name, max_active_projects, max_storage_bytes, max_photos_per_project)
values ('free', 'Free', 25, 10 * 1024::bigint * 1024 * 1024, 600);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  plan_id uuid not null references public.plans (id),
  storage_used_bytes bigint not null default 0 check (storage_used_bytes >= 0),
  default_locale text not null default 'en' check (default_locale in ('ru', 'en')),
  default_retouch_limit integer not null default 10 check (default_retouch_limit between 0 and 500),
  brand_name text,
  watermark_text text,
  watermark_logo_key text,
  calendar_feed_token text not null unique default private.random_token(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workspaces is 'A photographer studio: the tenant boundary for all data.';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  locale text not null default 'en' check (locale in ('ru', 'en')),
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Photographer profile, one per auth user.';

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.workspace_role not null default 'OWNER',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- Membership check used by every tenant policy. SECURITY DEFINER so the policy on
-- workspace_members itself does not recurse.
create function private.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public;
grant execute on function private.is_workspace_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Projects and the client
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  status public.project_status not null default 'DRAFT',
  shoot_start timestamptz,
  shoot_end timestamptz,
  timezone text not null default 'America/New_York',
  location_name text,
  location_address text,
  location_map_url text,
  google_place_id text,
  location_lat double precision check (location_lat between -90 and 90),
  location_lng double precision check (location_lng between -180 and 180),
  place_synced_at timestamptz,
  notes text,
  access_token text not null unique default private.random_token(),
  pin_hash text,
  pin_failed_attempts integer not null default 0 check (pin_failed_attempts >= 0),
  pin_locked_until timestamptz,
  client_locale text not null default 'en' check (client_locale in ('ru', 'en')),
  retouch_limit integer not null default 10 check (retouch_limit between 0 and 500),
  extra_retouch_enabled boolean not null default false,
  selection_submitted_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  reminder_24h_sent_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_shoot_window check (shoot_end is null or shoot_start is null or shoot_end > shoot_start),
  constraint projects_coordinates_pair check ((location_lat is null) = (location_lng is null))
);

comment on column public.projects.access_token is 'Secret for the client portal link /p/{token}. Rotating it revokes the old link.';
comment on column public.projects.status is 'Changed only through public.transition_project_status().';

create index projects_workspace_shoot_idx on public.projects (workspace_id, shoot_start);
create index projects_status_shoot_idx on public.projects (status, shoot_start)
  where archived_at is null;

create table public.project_clients (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  email text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.project_clients is 'The single model or client of a project. They have no account.';

-- ---------------------------------------------------------------------------
-- Pre-production: moodboard, wardrobe, equipment
-- ---------------------------------------------------------------------------

create table public.concept_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  category public.concept_category not null,
  title text not null default '' check (char_length(title) <= 200),
  description text check (char_length(description) <= 4000),
  image_key text,
  status public.concept_status not null default 'PENDING',
  status_changed_at timestamptz,
  -- Defaults to true for moodboard and wardrobe, false for equipment (set in a trigger).
  visible_to_client boolean not null,
  is_checked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index concept_items_project_idx on public.concept_items (project_id, category, sort_order);

create function private.concept_items_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.visible_to_client is null then
    new.visible_to_client := new.category <> 'EQUIPMENT';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Shoot day: shot list and day-of references
-- ---------------------------------------------------------------------------

create table public.shot_list_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Set when the item was collected from a moodboard or wardrobe card.
  concept_item_id uuid references public.concept_items (id) on delete set null,
  title text not null default '' check (char_length(title) <= 200),
  description text check (char_length(description) <= 4000),
  reference_image_key text,
  shot_status public.shot_status not null default 'PENDING',
  reject_reason text check (char_length(reject_reason) <= 500),
  status_changed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shot_list_items_one_per_concept unique (project_id, concept_item_id)
);

create index shot_list_items_project_idx on public.shot_list_items (project_id, shot_status, sort_order);

-- ---------------------------------------------------------------------------
-- Proofing and delivery
-- ---------------------------------------------------------------------------

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  preview_key text not null,
  thumb_key text not null,
  width integer check (width > 0),
  height integer check (height > 0),
  bytes bigint not null default 0 check (bytes >= 0),
  is_selected boolean not null default false,
  selection_type public.selection_type,
  selected_at timestamptz,
  final_key text,
  final_preview_key text,
  final_bytes bigint check (final_bytes >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photos_selection_consistent check (
    (is_selected and selection_type is not null) or (not is_selected and selection_type is null)
  )
);

create index photos_project_idx on public.photos (project_id, sort_order);
create index photos_project_selected_idx on public.photos (project_id) where is_selected;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  concept_item_id uuid references public.concept_items (id) on delete cascade,
  photo_id uuid references public.photos (id) on delete cascade,
  author_type public.author_type not null,
  author_name text not null check (char_length(author_name) between 1 and 200),
  text text not null check (char_length(text) between 1 and 4000),
  created_at timestamptz not null default now(),
  constraint comments_single_target check (num_nonnulls(concept_item_id, photo_id) = 1)
);

create index comments_concept_idx on public.comments (concept_item_id, created_at) where concept_item_id is not null;
create index comments_photo_idx on public.comments (photo_id, created_at) where photo_id is not null;

create table public.extra_retouch_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  currency char(3) not null default 'USD',
  status public.retouch_order_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.extra_retouch_orders is 'Paid retouching beyond retouch_limit. Schema only in the MVP; UI is off.';

create index extra_retouch_orders_project_idx on public.extra_retouch_orders (project_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.notification_endpoints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  recipient_type public.recipient_type not null,
  user_id uuid references public.profiles (id) on delete cascade,
  project_client_id uuid references public.project_clients (id) on delete cascade,
  channel public.notification_channel not null,
  address text not null check (char_length(address) between 1 and 320),
  verified_at timestamptz,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_endpoints_recipient check (
    (recipient_type = 'PHOTOGRAPHER' and user_id is not null and project_client_id is null)
    or (recipient_type = 'CLIENT' and project_client_id is not null and user_id is null)
  )
);

create unique index notification_endpoints_user_channel_uq
  on public.notification_endpoints (workspace_id, user_id, channel) where user_id is not null;
create unique index notification_endpoints_client_channel_uq
  on public.notification_endpoints (project_client_id, channel) where project_client_id is not null;

create table public.link_codes (
  code text primary key default private.random_token(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  project_client_id uuid references public.project_clients (id) on delete cascade,
  channel public.notification_channel not null default 'TELEGRAM',
  expires_at timestamptz not null default now() + interval '15 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint link_codes_single_target check (num_nonnulls(user_id, project_client_id) = 1)
);

comment on table public.link_codes is 'One-time codes for linking Telegram via t.me/<bot>?start=<code>. Server-only.';

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null check (char_length(type) between 1 and 64),
  actor_type public.actor_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_project_idx on public.activity_events (project_id, created_at desc);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  event_id uuid references public.activity_events (id) on delete cascade,
  endpoint_id uuid not null references public.notification_endpoints (id) on delete cascade,
  status public.outbox_status not null default 'PENDING',
  attempts integer not null default 0 check (attempts >= 0),
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_outbox is 'Delivery queue for notifications. Server-only.';

create index notification_outbox_due_idx on public.notification_outbox (send_after) where status = 'PENDING';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function private.set_updated_at();
create trigger project_clients_updated_at before update on public.project_clients
  for each row execute function private.set_updated_at();
create trigger concept_items_updated_at before update on public.concept_items
  for each row execute function private.set_updated_at();
create trigger shot_list_items_updated_at before update on public.shot_list_items
  for each row execute function private.set_updated_at();
create trigger photos_updated_at before update on public.photos
  for each row execute function private.set_updated_at();
create trigger extra_retouch_orders_updated_at before update on public.extra_retouch_orders
  for each row execute function private.set_updated_at();
create trigger notification_endpoints_updated_at before update on public.notification_endpoints
  for each row execute function private.set_updated_at();
create trigger notification_outbox_updated_at before update on public.notification_outbox
  for each row execute function private.set_updated_at();

create trigger concept_items_defaults before insert on public.concept_items
  for each row execute function private.concept_items_defaults();

-- Child tables inherit workspace_id from their project.
create trigger project_clients_workspace before insert or update of project_id, workspace_id on public.project_clients
  for each row execute function private.set_workspace_from_project();
create trigger concept_items_workspace before insert or update of project_id, workspace_id on public.concept_items
  for each row execute function private.set_workspace_from_project();
create trigger shot_list_items_workspace before insert or update of project_id, workspace_id on public.shot_list_items
  for each row execute function private.set_workspace_from_project();
create trigger photos_workspace before insert or update of project_id, workspace_id on public.photos
  for each row execute function private.set_workspace_from_project();
create trigger comments_workspace before insert or update of project_id, workspace_id on public.comments
  for each row execute function private.set_workspace_from_project();
create trigger extra_retouch_orders_workspace before insert or update of project_id, workspace_id on public.extra_retouch_orders
  for each row execute function private.set_workspace_from_project();
create trigger activity_events_workspace before insert or update of project_id, workspace_id on public.activity_events
  for each row execute function private.set_workspace_from_project();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_clients enable row level security;
alter table public.concept_items enable row level security;
alter table public.shot_list_items enable row level security;
alter table public.photos enable row level security;
alter table public.comments enable row level security;
alter table public.extra_retouch_orders enable row level security;
alter table public.notification_endpoints enable row level security;
alter table public.link_codes enable row level security;
alter table public.activity_events enable row level security;
alter table public.notification_outbox enable row level security;

-- The anonymous role never reads tables directly: the client portal goes through
-- server handlers that validate the access token and use the service role.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- Plans are public reference data for signed-in photographers.
create policy plans_read on public.plans
  for select to authenticated
  using (true);

-- Workspaces: members read and update; creation happens in a server function (step 3).
create policy workspaces_member_read on public.workspaces
  for select to authenticated
  using (private.is_workspace_member(id));
create policy workspaces_member_update on public.workspaces
  for update to authenticated
  using (private.is_workspace_member(id))
  with check (private.is_workspace_member(id));

-- Profiles: a photographer sees and edits only their own.
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Membership is read-only for clients; it is managed by server functions.
create policy workspace_members_read on public.workspace_members
  for select to authenticated
  using (private.is_workspace_member(workspace_id));

-- Tenant tables: full access for members of the owning workspace.
create policy projects_member_all on public.projects
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
create policy project_clients_member_all on public.project_clients
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
create policy concept_items_member_all on public.concept_items
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
create policy shot_list_items_member_all on public.shot_list_items
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
create policy photos_member_all on public.photos
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
create policy comments_member_all on public.comments
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
create policy extra_retouch_orders_member_read on public.extra_retouch_orders
  for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy notification_endpoints_member_all on public.notification_endpoints
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));
create policy activity_events_member_read on public.activity_events
  for select to authenticated
  using (private.is_workspace_member(workspace_id));

-- link_codes and notification_outbox have RLS enabled and no policies:
-- only the service role (which bypasses RLS) can touch them.

-- ---------------------------------------------------------------------------
-- Column privileges
-- ---------------------------------------------------------------------------

-- Server-only tables: no direct access for signed-in users at all.
revoke all on public.link_codes, public.notification_outbox from authenticated;

-- Reference and membership tables are read-only for signed-in users.
revoke insert, update, delete on public.plans, public.workspace_members from authenticated;
revoke insert, delete on public.workspaces, public.profiles from authenticated;
revoke insert, update, delete on public.activity_events, public.extra_retouch_orders from authenticated;

-- Workspaces: plan, storage counter and feed token are managed by the server.
revoke update on public.workspaces from authenticated;
grant update (name, default_locale, default_retouch_limit, brand_name, watermark_text, watermark_logo_key)
  on public.workspaces to authenticated;

-- Profiles: everything except the primary key.
revoke update on public.profiles from authenticated;
grant update (name, email, locale, timezone) on public.profiles to authenticated;

-- Projects: status, its timestamps, the tenant and the portal secrets are not
-- writable directly. Status moves only through transition_project_status().
revoke update on public.projects from authenticated;
grant update (
  title, shoot_start, shoot_end, timezone,
  location_name, location_address, location_map_url, google_place_id,
  location_lat, location_lng, place_synced_at,
  notes, client_locale, retouch_limit, extra_retouch_enabled, archived_at
) on public.projects to authenticated;

-- Insert must not pick its own status or secrets.
revoke insert on public.projects from authenticated;
grant insert (
  workspace_id, title, shoot_start, shoot_end, timezone,
  location_name, location_address, location_map_url, google_place_id,
  location_lat, location_lng, place_synced_at,
  notes, client_locale, retouch_limit, extra_retouch_enabled
) on public.projects to authenticated;
