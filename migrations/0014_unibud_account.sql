create table if not exists unibud_accounts (
  user_id text primary key,
  first_name text not null,
  last_name text not null,
  username text not null,
  email text not null,
  terms_accepted_at timestamptz not null,
  status text not null,
  setup_step text not null,
  bio text not null default '',
  photo_url text not null default '',
  interests text not null default '',
  institution text not null default '',
  course text not null default '',
  location text not null default '',
  discoverable boolean not null default false,
  allow_messages boolean not null default false,
  show_institution boolean not null default true,
  show_location boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists unibud_accounts_username_idx on unibud_accounts (lower(username));
create unique index if not exists unibud_accounts_email_idx on unibud_accounts (lower(email));

create table if not exists unibud_auth_codes (
  id text primary key,
  email text not null,
  purpose text not null,
  code_hash text not null,
  salt text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists unibud_auth_codes_email_idx on unibud_auth_codes (email, purpose, created_at desc);

create table if not exists unibud_reset_tokens (
  id text primary key,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
