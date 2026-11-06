import { q } from '../db.js';
import { notifyUsers } from './notify.js';

/**
 * LYNC levels. A Lync is not a separate product: it is the streak that lives
 * inside a conversation and only grows when the conversation is genuinely
 * two-way. A day only counts when at least two members have spoken.
 */
export const MILESTONES = [
  { days: 3, name: 'Ember', note: 'The first spark.' },
  { days: 7, name: 'Flame', note: 'A full week of showing up.' },
  { days: 14, name: 'Beacon', note: 'Two weeks, steady.' },
  { days: 30, name: 'Constellation', note: 'A month of conversation.' },
  { days: 60, name: 'Aurora', note: 'Sixty days, still going.' },
  { days: 100, name: 'Eclipse', note: 'A hundred days. Rare.' },
];

const DAY_MS = 86400000;

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function shiftDay(key, delta) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return dayKey(date);
}

function levelFor(streak) {
  let current = { days: 0, name: 'Spark', note: 'One message each way starts it.' };
  for (const milestone of MILESTONES) {
    if (streak >= milestone.days) current = milestone;
  }
  return { ...current, reached: streak >= current.days };
}

function longestRun(days) {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const key of sorted) {
    run = previous && shiftDay(previous, 1) === key ? run + 1 : 1;
    best = Math.max(best, run);
    previous = key;
  }
  return best;
}

/**
 * Streak, best streak and the last week of activity for one conversation.
 * Days are counted in UTC so a Lync means the same thing on every device.
 */
export async function computeLync(conversationId) {
  const [{ rows: dayRows }, { rows: memberRows }] = await Promise.all([
    q(
      `select to_char((created_at at time zone 'UTC'), 'YYYY-MM-DD') as day,
              count(distinct sender_id)::int as senders
         from messages
        where conversation_id = $1 and sender_id is not null
        group by 1
        order by 1 desc`,
      [conversationId],
    ),
    q('select count(*)::int as members from conversation_members where conversation_id = $1', [
      conversationId,
    ]),
  ]);

  const members = memberRows[0]?.members ?? 0;
  // Two-way on purpose: a day only counts when at least two people spoke.
  const required = Math.min(Math.max(members, 1), 2);
  const active = new Set(dayRows.filter((row) => row.senders >= required).map((row) => row.day));

  const today = dayKey(new Date());
  let cursor = active.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }

  const historicalBest = longestRun(active);
  const { rows: stateRows } = await q(
    `insert into lync_state (conversation_id, best_streak, updated_at)
     values ($1, $2, now())
     on conflict (conversation_id) do update
       set best_streak = greatest(lync_state.best_streak, excluded.best_streak),
           updated_at = now()
     returning best_streak, celebrated_milestone`,
    [conversationId, historicalBest],
  );

  const week = Array.from({ length: 7 }, (_, index) => {
    const day = shiftDay(today, index - 6);
    return { day, active: active.has(day) };
  });

  return {
    streak,
    bestStreak: Math.max(historicalBest, stateRows[0]?.best_streak ?? 0),
    level: levelFor(streak),
    next: MILESTONES.find((milestone) => milestone.days > streak) ?? null,
    activeToday: active.has(today),
    week,
    lastActiveDay: dayRows[0]?.day ?? null,
    celebratedMilestone: stateRows[0]?.celebrated_milestone ?? 0,
    members,
  };
}

async function conversationLabel(conversationId, viewerId) {
  const { rows } = await q(
    `select c.kind, c.title,
            (select u.name
               from conversation_members cm2
               join users u on u.id = cm2.user_id
              where cm2.conversation_id = c.id and cm2.user_id <> $2
              order by u.name
              limit 1) as other_name
       from conversations c
      where c.id = $1`,
    [conversationId, viewerId],
  );
  const row = rows[0];
  if (!row) return 'conversation';
  return row.kind === 'direct' ? (row.other_name ?? 'conversation') : (row.title ?? 'group');
}

/** Announce a milestone exactly once, when a streak first reaches it. */
export async function maybeCelebrate(conversationId, streak) {
  const reached = MILESTONES.filter((milestone) => milestone.days <= streak).pop();
  if (!reached) return null;

  const { rows: stateRows } = await q(
    'select celebrated_milestone from lync_state where conversation_id = $1',
    [conversationId],
  );
  const celebrated = stateRows[0]?.celebrated_milestone ?? 0;
  if (celebrated >= reached.days) return null;

  await q(
    'update lync_state set celebrated_milestone = $2, updated_at = now() where conversation_id = $1',
    [conversationId, reached.days],
  );

  const { rows: members } = await q(
    'select user_id from conversation_members where conversation_id = $1',
    [conversationId],
  );

  for (const member of members) {
    const label = await conversationLabel(conversationId, member.user_id);
    await notifyUsers([member.user_id], {
      source: 'LYNC',
      category: 'lync',
      title: `${reached.name} · ${streak}-day LYNC`,
      body: `${reached.note} You and ${label} just reached ${reached.name}.`,
      conversationId,
    });
  }

  return reached;
}

/**
 * Friendly reminders for Lyncs that are about to fade or already have.
 * Runs on an interval in the API process; each conversation is reminded at
 * most once every 20 hours.
 */
export async function runLyncReminders() {
  const { rows } = await q(
    `select c.id, ls.best_streak, ls.last_reminded_at,
            (select max(created_at) from messages m where m.conversation_id = c.id) as last_message_at
       from conversations c
       join lync_state ls on ls.conversation_id = c.id
      where ls.best_streak > 0
        and (ls.last_reminded_at is null or ls.last_reminded_at < now() - interval '20 hours')`,
  );

  for (const row of rows) {
    if (row.last_message_at && Date.now() - new Date(row.last_message_at).getTime() < 20 * 3600000) {
      continue;
    }
    const lync = await computeLync(row.id);
    if (lync.bestStreak < 2) continue;

    await q('update lync_state set last_reminded_at = now() where conversation_id = $1', [row.id]);

    const { rows: members } = await q(
      'select user_id from conversation_members where conversation_id = $1',
      [row.id],
    );

    for (const member of members) {
      const label = await conversationLabel(row.id, member.user_id);
      const body =
        lync.streak > 0
          ? `Your ${lync.streak}-day LYNC with ${label} is about to fade. One message each keeps it alive.`
          : `Your ${lync.bestStreak}-day LYNC with ${label} has faded. Start a new one when you are ready.`;
      await notifyUsers([member.user_id], {
        source: 'LYNC',
        category: 'lync',
        title: lync.streak > 0 ? 'LYNC about to fade' : 'LYNC faded',
        body,
        conversationId: row.id,
      });
    }
  }
}

export { DAY_MS };
