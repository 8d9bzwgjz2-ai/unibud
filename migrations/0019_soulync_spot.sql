alter table soulync_members add column if not exists spot text not null default '';
alter table soulync_members add column if not exists lat double precision;
alter table soulync_members add column if not exists lng double precision;
alter table soulync_swipes add column if not exists note text not null default '';
