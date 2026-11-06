create table if not exists board_rooms (
  id text primary key,
  kind text not null,
  title text not null,
  subtitle text not null default '',
  owner_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists board_rooms_kind_idx on board_rooms (kind, created_at desc);

create table if not exists board_members (
  room_id text not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists board_posts (
  id text primary key,
  author_id text not null,
  body text not null,
  image text,
  created_at timestamptz not null default now()
);

create index if not exists board_posts_author_idx on board_posts (author_id, created_at desc);

create table if not exists board_news (
  id text primary key,
  author_id text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists board_news_created_idx on board_news (created_at desc);

create table if not exists profile_highlights (
  id text primary key,
  user_id text not null,
  name text not null,
  cover text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists profile_highlights_user_idx on profile_highlights (user_id, created_at desc);
