import { Router } from 'express';
import { q } from '../db.js';
import { requireUser } from '../auth.js';
import { isMember, listMyConversations } from '../services/conversations.js';
import { computeLync, maybeCelebrate } from '../services/lync.js';
import { notifyUsers } from '../services/notify.js';

const router = Router();
router.use(requireUser);

const MAX_BODY = 2000;

function mapMessage(row) {
  return {
    id: row.id,
    body: row.body,
    kind: row.kind,
    senderId: row.sender_id,
    senderName: row.sender_name ?? null,
    createdAt: row.created_at,
  };
}

router.get('/conversations', async (req, res, next) => {
  try {
    const conversations = await listMyConversations(req.user.id);
    const withLync = [];
    for (const conversation of conversations) {
      withLync.push({ ...conversation, lync: await computeLync(conversation.id) });
    }
    const unread = withLync.reduce((total, conversation) => total + conversation.unread, 0);
    res.json({ conversations: withLync, unread });
  } catch (error) {
    next(error);
  }
});

router.get('/conversations/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!(await isMember(id, req.user.id))) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const [{ rows: convRows }, { rows: memberRows }, { rows: messageRows }] = await Promise.all([
      q('select id, kind, title, topic, created_at from conversations where id = $1', [id]),
      q(
        `select u.id, u.name, u.handle, u.avatar_tone, cm.role, cm.last_read_at
           from conversation_members cm
           join users u on u.id = cm.user_id
          where cm.conversation_id = $1
          order by u.name`,
        [id],
      ),
      q(
        `select m.id, m.body, m.kind, m.created_at, m.sender_id, u.name as sender_name
           from messages m
           left join users u on u.id = m.sender_id
          where m.conversation_id = $1
          order by m.created_at asc
          limit 300`,
        [id],
      ),
    ]);

    const conversation = convRows[0];
    const others = memberRows.filter((member) => member.id !== req.user.id);

    await q(
      'update conversation_members set last_read_at = now() where conversation_id = $1 and user_id = $2',
      [id, req.user.id],
    );
    await q(
      `update notifications set read_at = now()
        where user_id = $1 and conversation_id = $2 and read_at is null`,
      [req.user.id, id],
    );

    res.json({
      conversation: {
        id: conversation.id,
        kind: conversation.kind,
        title:
          conversation.kind === 'direct'
            ? (others[0]?.name ?? 'Conversation')
            : (conversation.title ?? 'Group'),
        topic: conversation.topic,
        createdAt: conversation.created_at,
      },
      members: memberRows.map((member) => ({
        id: member.id,
        name: member.name,
        handle: member.handle,
        avatarTone: member.avatar_tone,
        role: member.role,
        lastReadAt: member.last_read_at,
      })),
      messages: messageRows.map(mapMessage),
      lync: await computeLync(id),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!(await isMember(id, req.user.id))) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const body = String(req.body?.body ?? '').trim();
    if (!body) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (body.length > MAX_BODY) {
      return res.status(400).json({ error: `Messages are limited to ${MAX_BODY} characters.` });
    }

    const { rows } = await q(
      `insert into messages (conversation_id, sender_id, body)
       values ($1, $2, $3)
       returning id, body, kind, sender_id, created_at`,
      [id, req.user.id, body],
    );

    await q(
      'update conversation_members set last_read_at = now() where conversation_id = $1 and user_id = $2',
      [id, req.user.id],
    );

    const [{ rows: convRows }, { rows: memberRows }] = await Promise.all([
      q('select kind, title from conversations where id = $1', [id]),
      q(
        `select u.id, u.name
           from conversation_members cm
           join users u on u.id = cm.user_id
          where cm.conversation_id = $1 and cm.user_id <> $2`,
        [id, req.user.id],
      ),
    ]);

    const conversation = convRows[0];
    const title =
      conversation.kind === 'direct'
        ? req.user.name
        : `${req.user.name} · ${conversation.title ?? 'Group'}`;
    const preview = body.length > 90 ? `${body.slice(0, 90)}…` : body;

    await notifyUsers(
      memberRows.map((member) => member.id),
      {
        source: 'Chat',
        category: 'messages',
        title,
        body: preview,
        conversationId: id,
      },
    );

    const lync = await computeLync(id);
    const milestone = await maybeCelebrate(id, lync.streak);

    res.status(201).json({
      message: mapMessage({ ...rows[0], sender_name: req.user.name }),
      lync,
      milestone,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
