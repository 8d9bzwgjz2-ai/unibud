-- Real identity social layer: post ownership, follows, connection
-- requests, blocks, and account-to-account direct messages.
--
-- Posts gain the verified author's user id so edit/delete can enforce
-- ownership server-side (author_handle stays for display/back-compat with
-- seeded catalog posts).

alter table posts add column if not exists user_id text;
create index if not exists posts_user_idx on posts (user_id);

-- One-way follows between verified accounts.
create table if not exists follows (
  follower_id text not null,
  followee_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

-- Mutual Connect requests: pending until accepted, then both parties are
-- "connected". Declining deletes the row.
create table if not exists connect_requests (
  id text primary key,
  from_id text not null,
  to_id text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);
create index if not exists connect_requests_to_idx on connect_requests (to_id, status);

-- Blocks: one-way, but always enforced in BOTH directions for interactions
-- (a blocked user cannot follow, request, or DM the blocker either).
create table if not exists blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- One direct-message thread per unordered pair of verified accounts.
create table if not exists dm_threads (
  id text primary key,
  user_a text not null,
  user_b text not null,
  last_body text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_a, user_b)
);
create index if not exists dm_threads_a_idx on dm_threads (user_a, updated_at desc);
create index if not exists dm_threads_b_idx on dm_threads (user_b, updated_at desc);

create table if not exists dm_messages (
  id text primary key,
  thread_id text not null,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists dm_messages_thread_idx on dm_messages (thread_id, created_at);
