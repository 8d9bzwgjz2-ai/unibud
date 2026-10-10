alter table student_profiles add column if not exists campus_role text not null default 'student';
alter table student_profiles add column if not exists onboarding_done boolean not null default false;

create table if not exists post_replies (
  id text primary key,
  post_id text not null,
  user_id text not null,
  author_handle text not null,
  parent_id text,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists post_replies_post_idx on post_replies (post_id, created_at);
