-- Persistent user reports (problems, bugs, content, feedback). Reality First:
-- the UI may only say "submitted" after a row exists here.
create table if not exists user_reports (
  id text primary key,
  reporter_id text not null,
  kind text not null check (kind in ('problem','bug','content','feedback')),
  body text not null check (length(body) between 1 and 4000),
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists user_reports_reporter_idx on user_reports (reporter_id, created_at desc);
