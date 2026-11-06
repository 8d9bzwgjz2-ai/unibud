create table if not exists direct_threads (
  id text primary key,
  low_id text not null,
  high_id text not null,
  last_body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (low_id, high_id)
);

create index if not exists direct_threads_low_idx on direct_threads (low_id, updated_at desc);
create index if not exists direct_threads_high_idx on direct_threads (high_id, updated_at desc);

create table if not exists direct_messages (
  id text primary key,
  thread_id text not null,
  sender_id text not null,
  body text not null,
  media_id text,
  share_kind text,
  share_json text,
  created_at timestamptz not null default now()
);

create index if not exists direct_messages_thread_idx on direct_messages (thread_id, created_at);
