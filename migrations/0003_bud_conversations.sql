create table if not exists bud_conversations (
  id text primary key,
  user_id text not null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bud_conversations_user_idx
  on bud_conversations (user_id, updated_at desc);

alter table bud_messages add column if not exists conversation_id text;
create index if not exists bud_messages_convo_idx
  on bud_messages (conversation_id, created_at);
