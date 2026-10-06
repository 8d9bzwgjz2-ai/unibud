-- Quad: communities are open-ended environments that real users can create,
-- and each Quad can contain multiple groups (focused areas inside the Quad).
alter table communities add column if not exists created_by text;
alter table communities add column if not exists created_at timestamptz not null default now();

alter table posts add column if not exists group_id text;
create index if not exists posts_group_idx on posts (group_id);

create table if not exists quad_groups (
  id text primary key,
  quad_id text not null references communities(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists quad_groups_quad_idx on quad_groups (quad_id);

create table if not exists quad_group_members (
  user_id text not null,
  group_id text not null references quad_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

create table if not exists quad_announcements (
  id text primary key,
  quad_id text not null references communities(id) on delete cascade,
  author_handle text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists quad_announcements_quad_idx on quad_announcements (quad_id);

-- Lync: real persisted sharing state. A row exists only after a user's first
-- qualifying share — nothing is ever seeded here.
create table if not exists lync_states (
  user_id text primary key,
  count int not null default 0,
  active boolean not null default false,
  started_on date not null,
  last_share_on date not null,
  broken_on date,
  updated_at timestamptz not null default now()
);

create table if not exists lync_shares (
  id text primary key,
  user_id text not null,
  post_id text,
  shared_on date not null,
  created_at timestamptz not null default now()
);
create index if not exists lync_shares_user_idx on lync_shares (user_id, created_at desc);

-- Milestone configuration (product config, not activity). Real rewards are
-- granted separately into lync_rewards — a bonus is only ever "ready" when a
-- real granted row exists there.
create table if not exists lync_milestones (
  days int primary key,
  label text not null
);
insert into lync_milestones (days, label) values (7, 'first bonus') on conflict (days) do nothing;

create table if not exists lync_rewards (
  id text primary key,
  user_id text not null,
  milestone_days int not null,
  note text not null default '',
  granted_at timestamptz not null default now()
);
create index if not exists lync_rewards_user_idx on lync_rewards (user_id);
