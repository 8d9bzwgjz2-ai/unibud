import { q } from '../db.js';

/**
 * Conversations the user belongs to, with the last message, unread count and
 * everyone's read position (used for delivery and read states).
 */
export async function listMyConversations(userId) {
  const { rows } = await q(
    `select c.id, c.kind, c.title, c.topic, c.created_at,
            (select json_agg(
                      json_build_object(
                        'id', u.id,
                        'name', u.name,
                        'handle', u.handle,
                        'avatarTone', u.avatar_tone
                      ) order by u.name
                    )
               from conversation_members cm2
               join users u on u.id = cm2.user_id
              where cm2.conversation_id = c.id) as members,
            (select json_build_object(
                      'id', m.id,
                      'body', m.body,
                      'kind', m.kind,
                      'createdAt', m.created_at,
                      'senderId', m.sender_id,
                      'senderName', u2.name
                    )
               from messages m
               left join users u2 on u2.id = m.sender_id
              where m.conversation_id = c.id
              order by m.created_at desc
              limit 1) as last_message,
            (select count(*)::int
               from messages m3
              where m3.conversation_id = c.id
                and m3.sender_id is distinct from $1
                and m3.created_at > cm.last_read_at) as unread
       from conversations c
       join conversation_members cm on cm.conversation_id = c.id and cm.user_id = $1
      order by coalesce(
                 (select max(m4.created_at) from messages m4 where m4.conversation_id = c.id),
                 c.created_at
               ) desc`,
    [userId],
  );

  return rows.map((row) => {
    const others = (row.members ?? []).filter((member) => member.id !== userId);
    return {
      id: row.id,
      kind: row.kind,
      title: row.kind === 'direct' ? (others[0]?.name ?? 'Conversation') : (row.title ?? 'Group'),
      topic: row.topic,
      members: row.members ?? [],
      others,
      lastMessage: row.last_message,
      unread: row.unread,
      createdAt: row.created_at,
    };
  });
}

export async function isMember(conversationId, userId) {
  const { rowCount } = await q(
    'select 1 from conversation_members where conversation_id = $1 and user_id = $2',
    [conversationId, userId],
  );
  return rowCount > 0;
}
