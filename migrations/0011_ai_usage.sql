create table if not exists ai_usage (
  id text primary key,
  user_id text not null,
  product text not null check (product in ('bud','riff')),
  provider text not null,
  model text,
  status text not null check (status in ('ok','error')),
  error_code text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_product_created_idx
  on ai_usage (user_id, product, created_at desc);

create index if not exists ai_usage_created_idx
  on ai_usage (created_at desc);
