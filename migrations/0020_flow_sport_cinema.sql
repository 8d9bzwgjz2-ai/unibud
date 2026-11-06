alter table wallets add column if not exists savings_kobo integer not null default 0;
alter table wallets add column if not exists member_no text not null default '';

create table if not exists sport_matches (
  id text primary key,
  owner_id text not null,
  competition text not null,
  home_name text not null,
  away_name text not null,
  home_score integer,
  away_score integer,
  kickoff text not null default '',
  venue text not null default '',
  status text not null default 'fixture',
  created_at timestamptz not null default now()
);

create table if not exists cinema_titles (
  id text primary key,
  owner_id text not null,
  title text not null,
  logline text not null default '',
  genre text not null default 'Campus',
  year_text text not null default '',
  runtime_text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists cinema_list (
  user_id text not null,
  title_id text not null,
  progress integer not null default 0,
  primary key (user_id, title_id)
);
