create table if not exists soulync_members (
  user_id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists soulync_swipes (
  from_id text not null,
  to_id text not null,
  direction text not null,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id)
);

create table if not exists wayward_plans (
  id text primary key,
  owner_id text not null,
  lane text not null,
  title text not null,
  place text not null default '',
  when_text text not null default '',
  details text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists wayward_members (
  plan_id text not null,
  user_id text not null,
  primary key (plan_id, user_id)
);

create table if not exists wayward_messages (
  id text primary key,
  plan_id text not null,
  user_id text not null,
  sender_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists wayward_messages_idx on wayward_messages (plan_id, created_at);

create table if not exists concierge_messages (
  id text primary key,
  user_id text not null,
  role text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists concierge_messages_idx on concierge_messages (user_id, created_at);
