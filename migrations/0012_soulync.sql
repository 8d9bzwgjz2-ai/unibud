create table if not exists soulync_profiles (
  user_id text primary key references "user"(id) on delete cascade,
  display_name text not null,
  age integer not null check (age >= 18 and age <= 99),
  campus text not null default '',
  program text not null default '',
  intent text not null default 'open' check (intent in ('friends','dating','long-term','open')),
  interests text[] not null default '{}',
  prompt text not null default '',
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists soulync_profiles_discovery_idx
  on soulync_profiles (paused, campus, updated_at desc);

create table if not exists soulync_decisions (
  user_id text not null references "user"(id) on delete cascade,
  target_user_id text not null,
  decision text not null check (decision in ('like','pass')),
  created_at timestamptz not null default now(),
  primary key (user_id, target_user_id)
);

create index if not exists soulync_decisions_target_idx
  on soulync_decisions (target_user_id, decision);

create table if not exists soulync_blocks (
  user_id text not null references "user"(id) on delete cascade,
  blocked_user_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id)
);
