import { Router } from 'express';
import { requireUser } from '../auth.js';
import { listMyConversations } from '../services/conversations.js';
import { computeLync, MILESTONES } from '../services/lync.js';

const router = Router();
router.use(requireUser);

router.get('/', async (req, res, next) => {
  try {
    const conversations = await listMyConversations(req.user.id);
    const lyncs = [];
    for (const conversation of conversations) {
      const lync = await computeLync(conversation.id);
      lyncs.push({
        conversationId: conversation.id,
        title: conversation.title,
        kind: conversation.kind,
        others: conversation.others,
        members: conversation.members,
        lastMessage: conversation.lastMessage,
        streak: lync.streak,
        bestStreak: lync.bestStreak,
        level: lync.level,
        next: lync.next,
        activeToday: lync.activeToday,
        week: lync.week,
        lastActiveDay: lync.lastActiveDay,
      });
    }
    lyncs.sort((a, b) => b.streak - a.streak || b.bestStreak - a.bestStreak);
    res.json({ lyncs, milestones: MILESTONES });
  } catch (error) {
    next(error);
  }
});

export default router;
