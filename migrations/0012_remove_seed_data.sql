-- Reality First: remove the invented demo catalog that earlier builds seeded.
-- Real rows are untouched: real listings carry owner_user_id, real posts use ids p_<uuid>.
delete from post_replies where post_id in (select id from posts where id !~ '^p_');
delete from post_likes where post_id in (select id from posts where id !~ '^p_');
delete from saves where kind = 'post' and item_id !~ '^p_';
delete from posts where id !~ '^p_';
delete from listings where owner_user_id is null;
delete from discovery_items;
delete from directory_people;
-- Membership counts reflect real joined accounts only.
update communities c set members = (
  select count(*) from community_members m where m.community_id = c.id
);
