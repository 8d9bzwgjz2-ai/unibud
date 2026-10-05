create table if not exists enrollments (
  id text primary key,
  user_id text not null,
  course_code text not null,
  course_title text not null,
  semester text not null,
  session_label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, course_code, semester)
);
create index if not exists enrollments_user_idx on enrollments (user_id);

create table if not exists board_announcements (
  id text primary key,
  course_code text not null,
  author_id text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists attendance_events (
  id text primary key,
  session_id text not null,
  user_id text not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists attendance_session_idx on attendance_events (session_id, user_id);

create table if not exists class_questions (
  id text primary key,
  session_id text not null,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
