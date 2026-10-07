-- Spark × Google Calendar: per-student OAuth connections (tokens encrypted at
-- rest with a key derived from BETTER_AUTH_SECRET) and the Google event id on
-- each calendar event so bookings stay synchronized.

create table if not exists google_calendar_connections (
  user_id text primary key,
  google_email text,
  access_token_enc text not null,
  refresh_token_enc text not null,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table calendar_events add column if not exists google_event_id text;
