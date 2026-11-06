create table if not exists user_vault (
  user_id text primary key,
  pin_hash text,
  pin_salt text,
  passkey_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
