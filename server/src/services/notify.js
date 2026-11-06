import { q } from '../db.js';

/**
 * One notification service for the whole platform. Every notification carries
 * the product it came from and, where relevant, the exact destination to open.
 * User preferences are respected at creation time.
 */
export async function notifyUsers(userIds, { source, category, title, body, conversationId = null }) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return [];

  const { rows: prefs } = await q(
    'select user_id, enabled from notification_prefs where user_id = any($1::uuid[]) and category = $2',
    [unique, category],
  );
  const blocked = new Set(prefs.filter((pref) => !pref.enabled).map((pref) => pref.user_id));
  const targets = unique.filter((id) => !blocked.has(id));
  if (!targets.length) return [];

  if (category === 'messages' && conversationId) {
    // Keep one live alert per conversation instead of a stack of them.
    await q(
      `delete from notifications
        where user_id = any($1::uuid[]) and category = 'messages'
          and conversation_id = $2 and read_at is null`,
      [targets, conversationId],
    );
  }

  const created = [];
  for (const userId of targets) {
    const { rows } = await q(
      `insert into notifications (user_id, source, category, title, body, conversation_id)
       values ($1, $2, $3, $4, $5, $6)
       returning id, created_at`,
      [userId, source, category, title, body, conversationId],
    );
    created.push({ userId, id: rows[0].id, createdAt: rows[0].created_at });
  }
  return created;
}
