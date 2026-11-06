import { Router } from 'express';
import { q } from '../db.js';
import { requireUser } from '../auth.js';

const router = Router();
router.use(requireUser);

const CATEGORIES = ['messages', 'lync', 'system'];

function mapNotification(row) {
  return {
    id: row.id,
    source: row.source,
    category: row.category,
    title: row.title,
    body: row.body,
    conversationId: row.conversation_id,
    read: Boolean(row.read_at),
    createdAt: row.created_at,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const [{ rows }, { rows: counts }] = await Promise.all([
      q(
        `select id, source, category, title, body, conversation_id, read_at, created_at
           from notifications
          where user_id = $1
          order by created_at desc
          limit 60`,
        [req.user.id],
      ),
      q(
        `select count(*)::int as unread from notifications where user_id = $1 and read_at is null`,
        [req.user.id],
      ),
    ]);
    res.json({ notifications: rows.map(mapNotification), unread: counts[0].unread });
  } catch (error) {
    next(error);
  }
});

router.get('/unread', async (req, res, next) => {
  try {
    const { rows } = await q(
      'select count(*)::int as unread from notifications where user_id = $1 and read_at is null',
      [req.user.id],
    );
    res.json({ unread: rows[0].unread });
  } catch (error) {
    next(error);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await q('update notifications set read_at = now() where user_id = $1 and read_at is null', [
      req.user.id,
    ]);
    res.json({ unread: 0 });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    const { rows } = await q(
      `update notifications set read_at = coalesce(read_at, now())
        where id = $1 and user_id = $2
        returning id`,
      [req.params.id, req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get('/prefs', async (req, res, next) => {
  try {
    const { rows } = await q(
      'select category, enabled from notification_prefs where user_id = $1',
      [req.user.id],
    );
    const prefs = Object.fromEntries(CATEGORIES.map((category) => [category, true]));
    for (const row of rows) prefs[row.category] = row.enabled;
    res.json({ prefs });
  } catch (error) {
    next(error);
  }
});

router.put('/prefs', async (req, res, next) => {
  try {
    const updates = CATEGORIES.filter((category) => typeof req.body?.[category] === 'boolean');
    if (!updates.length) return res.status(400).json({ error: 'No preferences supplied' });

    for (const category of updates) {
      await q(
        `insert into notification_prefs (user_id, category, enabled)
         values ($1, $2, $3)
         on conflict (user_id, category) do update set enabled = excluded.enabled`,
        [req.user.id, category, req.body[category]],
      );
    }

    const { rows } = await q(
      'select category, enabled from notification_prefs where user_id = $1',
      [req.user.id],
    );
    const prefs = Object.fromEntries(CATEGORIES.map((category) => [category, true]));
    for (const row of rows) prefs[row.category] = row.enabled;
    res.json({ prefs });
  } catch (error) {
    next(error);
  }
});

export default router;
