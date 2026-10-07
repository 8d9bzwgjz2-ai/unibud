-- Quad extensions: persistent interest groups with owner, privacy and category.
-- Extends the existing communities table so new Quads appear through the
-- existing Quad interface without a separate listing.

alter table communities add column if not exists owner_user_id text;
alter table communities add column if not exists privacy text not null default 'public';
alter table communities add column if not exists category text;
alter table communities add column if not exists created_at timestamptz not null default now();
