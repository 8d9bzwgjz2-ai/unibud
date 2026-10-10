-- Spark Calendar: tutoring bookings, community-service commitments and the
-- unified calendar_events table that mirrors the underlying booking/commitment
-- state. Calendar events are created automatically when a booking or commitment
-- is confirmed, and kept in sync on cancel/reschedule.

create table if not exists tutoring_bookings (
  id text primary key,
  student_id text not null,
  tutor_handle text not null,
  course_code text,
  title text not null,
  scheduled_at timestamptz not null,
  duration_min integer not null default 60,
  status text not null default 'confirmed',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists tutoring_bookings_student_idx on tutoring_bookings (student_id, scheduled_at);

create table if not exists community_service_commitments (
  id text primary key,
  student_id text not null,
  title text not null,
  organization text not null default '',
  scheduled_at timestamptz not null,
  duration_min integer not null default 120,
  hours integer not null default 0,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);
create index if not exists community_service_student_idx on community_service_commitments (student_id, scheduled_at);

create table if not exists calendar_events (
  id text primary key,
  user_id text not null,
  source_type text not null check (source_type in ('tutoring','community_service')),
  source_id text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed',
  participants text not null default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);
create index if not exists calendar_events_user_idx on calendar_events (user_id, starts_at);
