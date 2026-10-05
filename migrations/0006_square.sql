alter table posts add column if not exists video text;
alter table posts add column if not exists kind text not null default 'post';

create table if not exists post_likes (
  user_id text not null,
  post_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists post_likes_post_idx on post_likes (post_id);

create table if not exists comment_likes (
  user_id text not null,
  reply_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, reply_id)
);
