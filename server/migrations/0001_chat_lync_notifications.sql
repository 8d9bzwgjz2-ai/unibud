create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text not null unique,
  email text not null unique,
  password_hash text not null,
  avatar_tone text not null default 'ink',
  headline text,
  created_at timestamptz not null default now()
);

create table sessions (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group')),
  title text,
  topic text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid references users(id) on delete set null,
  kind text not null default 'text' check (kind in ('text', 'system')),
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on messages (conversation_id, created_at);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source text not null,
  category text not null check (category in ('messages', 'lync', 'system')),
  title text not null,
  body text,
  conversation_id uuid references conversations(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on notifications (user_id, created_at desc);

create table notification_prefs (
  user_id uuid not null references users(id) on delete cascade,
  category text not null check (category in ('messages', 'lync', 'system')),
  enabled boolean not null default true,
  primary key (user_id, category)
);

create table lync_state (
  conversation_id uuid primary key references conversations(id) on delete cascade,
  best_streak integer not null default 0,
  celebrated_milestone integer not null default 0,
  last_reminded_at timestamptz,
  updated_at timestamptz not null default now()
);
