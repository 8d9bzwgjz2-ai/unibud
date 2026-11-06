alter table listings add column if not exists status text not null default 'available';

create table if not exists market_offers (
  id text primary key,
  listing_id text not null,
  buyer_id text not null,
  status text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists market_offers_listing_idx on market_offers (listing_id, created_at desc);
