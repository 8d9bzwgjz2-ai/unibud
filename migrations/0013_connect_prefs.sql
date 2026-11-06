alter table connect_profiles add column if not exists notify_requests boolean not null default true;
alter table connect_profiles add column if not exists notify_follows boolean not null default true;
