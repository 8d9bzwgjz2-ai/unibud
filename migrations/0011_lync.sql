-- Lync streak tracking: one qualifying share per calendar day per student.
-- Milestones are earned at defined levels and preserved even when a streak resets.

create table if not exists lync_shares (
  user_id text not null,
  share_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, share_date)
);
create index if not exists lync_shares_user_idx on lync_shares (user_id, share_date desc);

create table if not exists lync_streaks (
  user_id text primary key,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_share_date date,
  updated_at timestamptz not null default now()
);

create table if not exists lync_milestones (
  user_id text not null,
  level integer not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, level)
);
create index if not exists lync_milestones_user_idx on lync_milestones (user_id, level);
