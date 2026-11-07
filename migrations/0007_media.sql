-- Persistent media, Bud academic objects, chat attachments, rights, monetization (revenue stays 0).

create table if not exists media_assets (
  id text primary key,
  owner_id text not null,
  kind text not null,
  mime_type text not null,
  file_name text not null,
  file_size integer not null default 0,
  duration_ms integer,
  width integer,
  height integer,
  storage_path text not null,
  thumbnail_path text,
  status text not null default 'uploading',
  visibility text not null default 'private',
  conversation_id text,
  room_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_owner_idx on media_assets (owner_id, created_at desc);

create table if not exists bud_media (
  id text primary key,
  owner_id text not null,
  kind text not null,
  title text not null,
  course text,
  class_id text,
  lecturer text,
  school text,
  duration_min integer not null default 0,
  media_id text,
  status text not null default 'awaiting_file',
  visibility text not null default 'class',
  created_at timestamptz not null default now()
);

create table if not exists room_messages (
  id text primary key,
  room_id text not null,
  user_id text not null,
  sender_name text not null,
  body text not null default '',
  media_id text,
  share_kind text,
  share_json text,
  created_at timestamptz not null default now()
);
create index if not exists room_messages_idx on room_messages (room_id, created_at);

alter table messages add column if not exists media_id text;
alter table messages add column if not exists share_kind text;
alter table messages add column if not exists share_json text;

create table if not exists audio_objects (
  audio_id text primary key,
  source_type text not null,
  title text not null,
  creator_handle text,
  source_content_id text,
  media_id text,
  usage_count integer not null default 0,
  status text not null default 'active',
  rights_status text not null default 'original',
  created_at timestamptz not null default now()
);

create table if not exists audio_events (
  id text primary key,
  kind text not null,
  user_id text,
  audio_id text,
  bud_media_id text,
  provider_id text,
  surface text not null,
  created_at timestamptz not null default now()
);

create table if not exists media_reports (
  id text primary key,
  media_id text,
  audio_id text,
  reporter_id text not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists music_campaigns (
  id text primary key,
  provider text,
  artist_id text,
  track_id text,
  territory text,
  label text,
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'draft',
  budget_note text,
  created_at timestamptz not null default now()
);

create table if not exists partner_clicks (
  id text primary key,
  user_id text,
  provider text not null,
  track_id text,
  campaign_id text,
  surface text,
  revenue_kobo integer not null default 0,
  created_at timestamptz not null default now()
);
