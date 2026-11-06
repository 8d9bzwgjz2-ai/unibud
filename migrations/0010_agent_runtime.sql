create table if not exists agent_activity (
  id text primary key,
  request_id text not null,
  user_id text not null,
  agent_id text not null,
  state text not null check (state in ('idle','queued','working','waiting','completed','failed')),
  event text not null check (event in ('queued','started','waiting','completed','failed','skipped')),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists agent_activity_user_created_idx
  on agent_activity (user_id, created_at desc);

create index if not exists agent_activity_request_idx
  on agent_activity (request_id, created_at asc);
