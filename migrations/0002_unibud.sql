create table if not exists universities (
  id text primary key,
  name text not null,
  short_name text not null,
  city text not null
);

create table if not exists directory_people (
  handle text primary key,
  name text not null,
  university_id text not null,
  program text not null,
  year text not null,
  bio text not null,
  verified boolean not null default false
);

create table if not exists listings (
  id text primary key,
  owner_user_id text,
  kind text not null,
  category text not null,
  title text not null,
  description text not null,
  price_kobo integer not null,
  price_note text not null,
  image text,
  tone text not null default 'ink',
  seller_handle text not null,
  university_id text not null,
  location text not null,
  tags text not null default '[]',
  saved_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists listings_category_idx on listings (category);
create index if not exists listings_owner_idx on listings (owner_user_id);

create table if not exists communities (
  id text primary key,
  name text not null,
  kind text not null,
  university_id text,
  description text not null,
  cover text,
  members integer not null default 0
);

create table if not exists posts (
  id text primary key,
  community_id text not null,
  author_handle text not null,
  body text not null,
  image text,
  created_at timestamptz not null default now()
);
create index if not exists posts_community_idx on posts (community_id);

create table if not exists discovery_items (
  id text primary key,
  kicker text not null,
  title text not null,
  summary text not null,
  topic text not null,
  image text
);

create table if not exists student_profiles (
  user_id text primary key,
  display_name text not null,
  handle text not null unique,
  university_id text not null default 'unilag',
  program text not null default '',
  year text not null default '',
  bio text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists wallets (
  user_id text primary key,
  balance_kobo integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists wallet_tx (
  id text primary key,
  user_id text not null,
  type text not null,
  amount_kobo integer not null,
  status text not null,
  counterparty text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_user_idx on wallet_tx (user_id, created_at desc);

create table if not exists payment_requests (
  id text primary key,
  user_id text not null,
  direction text not null,
  peer_handle text not null,
  amount_kobo integer not null,
  note text not null default '',
  status text not null,
  created_at timestamptz not null default now()
);
create index if not exists payment_requests_user_idx on payment_requests (user_id, created_at desc);

create table if not exists saves (
  user_id text not null,
  kind text not null,
  item_id text not null,
  title text not null,
  href text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

create table if not exists conversations (
  id text primary key,
  user_id text not null,
  peer_handle text not null,
  listing_id text,
  last_body text not null default '',
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_idx on conversations (user_id, updated_at desc);

create table if not exists messages (
  id text primary key,
  conversation_id text not null,
  user_id text not null,
  sender text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_convo_idx on messages (conversation_id, created_at);

create table if not exists community_members (
  user_id text not null,
  community_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, community_id)
);

create table if not exists courses (
  id text primary key,
  user_id text not null,
  session_label text not null,
  semester text not null,
  title text not null,
  code text not null
);
create index if not exists courses_user_idx on courses (user_id);

create table if not exists study_materials (
  id text primary key,
  user_id text not null,
  course_id text not null,
  title text not null,
  kind text not null
);

create table if not exists study_sessions (
  id text primary key,
  user_id text not null,
  course_id text not null,
  title text not null,
  starts_at timestamptz not null,
  minutes integer not null
);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  body text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

create table if not exists bud_messages (
  id text primary key,
  user_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists bud_messages_user_idx on bud_messages (user_id, created_at);

create table if not exists funding_notes (
  user_id text primary key,
  program text not null default 'nelfund',
  status text not null default 'exploring',
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists creator_profiles (
  user_id text primary key,
  headline text not null default '',
  categories text not null default '[]',
  bio text not null default ''
);

create table if not exists catalog_seeded (
  id integer primary key,
  done boolean not null default true
);
