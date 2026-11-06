create table if not exists connect_profiles (
  user_id text primary key,
  display_name text not null default '',
  handle text not null,
  bio text not null default '',
  institution text not null default '',
  course text not null default '',
  role_title text not null default '',
  location text not null default '',
  interests text not null default '',
  skills text not null default '',
  show_institution boolean not null default true,
  show_course boolean not null default true,
  show_location boolean not null default false,
  show_interests boolean not null default true,
  discoverable boolean not null default false,
  follower_approval boolean not null default false,
  allow_requests boolean not null default true,
  allow_messages boolean not null default false,
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists connect_profiles_handle_idx on connect_profiles (lower(handle));

create table if not exists connect_follows (
  follower_id text not null,
  followed_id text not null,
  status text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id)
);

create table if not exists connect_requests (
  id text primary key,
  from_id text not null,
  to_id text not null,
  status text not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists connect_requests_to_idx on connect_requests (to_id, status, created_at desc);
create index if not exists connect_requests_from_idx on connect_requests (from_id, status, created_at desc);

create table if not exists connect_blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists connect_reports (
  id text primary key,
  reporter_id text not null,
  target_id text not null,
  category text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists connect_services (
  id text primary key,
  name text not null,
  description text not null,
  category text not null,
  provider text not null,
  integration text not null,
  route text not null,
  scopes text not null default ''
);

create table if not exists connect_grants (
  user_id text not null,
  service_id text not null,
  status text not null,
  scopes text not null default '',
  consented_at timestamptz,
  revoked_at timestamptz,
  primary key (user_id, service_id)
);

create table if not exists connect_notifications (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  body text not null,
  href text not null default '/connect',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists connect_notifications_user_idx on connect_notifications (user_id, created_at desc);
