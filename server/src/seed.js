import bcrypt from 'bcryptjs';
import { q } from './db.js';
import { MILESTONES, computeLync } from './services/lync.js';

const DAY = 86400000;

const PEOPLE = [
  {
    key: 'amara',
    name: 'Amara Okoye',
    handle: 'amara',
    email: 'amara@unibud.app',
    tone: 'ink',
    headline: 'Architecture, third year · Lagos',
  },
  {
    key: 'zara',
    name: 'Zara Bello',
    handle: 'zara',
    email: 'zara@unibud.app',
    tone: 'champagne',
    headline: 'Studio crit lead · Lagos',
  },
  {
    key: 'tobi',
    name: 'Tobi Adeyemi',
    handle: 'tobi',
    email: 'tobi@unibud.app',
    tone: 'moss',
    headline: 'Design society · Lagos',
  },
  {
    key: 'kwame',
    name: 'Kwame Mensah',
    handle: 'kwame',
    email: 'kwame@unibud.app',
    tone: 'clay',
    headline: 'Ceramics, second year · Accra',
  },
  {
    key: 'imani',
    name: 'Imani Cole',
    handle: 'imani',
    email: 'imani@unibud.app',
    tone: 'slate',
    headline: 'Archival research · Lagos',
  },
];

const THREADS = [
  {
    key: 'zara',
    kind: 'direct',
    topic: 'Studio work',
    members: ['amara', 'zara'],
    unreadFor: 'amara',
    entries: [
      { daysAgo: 5, from: 'amara', body: 'How did the site visit go?' },
      { daysAgo: 5, from: 'zara', body: 'Muddy. Useful. I will send you the photos tonight.' },
      { daysAgo: 4, from: 'zara', body: 'I found that reference book you were chasing. It is in reserves.' },
      { daysAgo: 4, from: 'amara', body: 'You are a lifesaver. I owe you lunch.' },
      { daysAgo: 3, from: 'amara', body: 'Coffee before the review?' },
      { daysAgo: 3, from: 'zara', body: 'Always. The one by the archive, half past eight.' },
      { daysAgo: 2, from: 'zara', body: 'Your section drawing is genuinely beautiful, by the way.' },
      { daysAgo: 2, from: 'amara', body: 'That means a lot coming from you. I nearly scrapped it.' },
      { daysAgo: 1, from: 'amara', body: 'The print lab is open until ten tonight.' },
      { daysAgo: 1, from: 'zara', body: 'I will head over after my shift. Save me a spot.' },
      { daysAgo: 0, from: 'amara', body: 'Did you finish the structural analysis set?' },
      { daysAgo: 0, from: 'zara', body: 'Barely. Question four still does not sit right with me.' },
      { daysAgo: 0, from: 'amara', body: 'Bring it to studio tomorrow — we can work it out before the crit.' },
      { daysAgo: 0, from: 'zara', body: 'Deal. I will bring the sketches too.' },
    ],
  },
  {
    key: 'tobi',
    kind: 'direct',
    topic: 'Society',
    members: ['amara', 'tobi'],
    entries: [
      { daysAgo: 1, from: 'tobi', body: 'Are you coming to the society meeting on Thursday?' },
      { daysAgo: 1, from: 'amara', body: 'Yes — I want to hear the funding plan.' },
      { daysAgo: 0, from: 'tobi', body: 'They moved it to the west lecture theatre.' },
      { daysAgo: 0, from: 'amara', body: 'Noted. I will be there by six.' },
    ],
  },
  {
    key: 'studio',
    kind: 'group',
    title: 'Third Floor Studio',
    topic: 'Shared studio, kiln rota and crits',
    members: ['amara', 'tobi', 'zara', 'kwame'],
    unreadFor: 'amara',
    entries: [
      { daysAgo: 2, from: 'kwame', body: 'The kiln is fixed. We can fire again from Monday.' },
      { daysAgo: 2, from: 'zara', body: 'Finally. I have three pieces waiting.' },
      { daysAgo: 2, from: 'amara', body: 'I will book the afternoon slot.' },
      { daysAgo: 1, from: 'tobi', body: 'Who left the model in the corridor? It nearly went over.' },
      { daysAgo: 1, from: 'amara', body: 'Mine. Sorry — moving it tonight.' },
      { daysAgo: 1, from: 'tobi', body: 'No stress, I just did not want it broken.' },
      { daysAgo: 0, from: 'kwame', body: 'Crit at four. Bring everything.' },
      { daysAgo: 0, from: 'zara', body: 'On my way.' },
      { daysAgo: 0, from: 'amara', body: 'Ten minutes out.' },
    ],
  },
  {
    key: 'crit',
    kind: 'group',
    title: 'Studio Crit',
    topic: 'Readings and Thursday crits',
    members: ['amara', 'zara', 'imani'],
    entries: [
      { daysAgo: 3, from: 'imani', body: 'Sending the reading for Thursday now.' },
      { daysAgo: 3, from: 'amara', body: 'Got it, thank you.' },
      { daysAgo: 2, from: 'zara', body: 'Can we start at nine instead of eight?' },
      { daysAgo: 2, from: 'imani', body: 'Nine works.' },
      { daysAgo: 1, from: 'amara', body: 'I will bring the projector.' },
      { daysAgo: 1, from: 'imani', body: 'Perfect. I will bring the prints.' },
      { daysAgo: 0, from: 'zara', body: 'Room is booked. See you both.' },
      { daysAgo: 0, from: 'imani', body: 'See you.' },
      { daysAgo: 0, from: 'amara', body: 'There.' },
    ],
  },
  {
    key: 'imani',
    kind: 'direct',
    topic: 'Archive',
    members: ['amara', 'imani'],
    entries: [
      { daysAgo: 6, from: 'imani', body: 'The archive closes at five, by the way.' },
      { daysAgo: 6, from: 'amara', body: 'Good to know.' },
      { daysAgo: 5, from: 'amara', body: 'Did you get the invoice through?' },
      { daysAgo: 5, from: 'imani', body: 'Yes, approved.' },
      { daysAgo: 4, from: 'imani', body: 'Lunch tomorrow?' },
      { daysAgo: 4, from: 'amara', body: 'Yes — the place by the river.' },
      { daysAgo: 3, from: 'amara', body: 'That was a good lunch.' },
      { daysAgo: 3, from: 'imani', body: 'We should do it more often.' },
      { daysAgo: 2, from: 'imani', body: 'Sending you the notes from today.' },
      { daysAgo: 2, from: 'amara', body: 'Received, thank you.' },
    ],
  },
];

async function createConversation(thread, userIds) {
  const memberIds = thread.members.map((key) => userIds[key]);
  const { rows } = await q(
    'insert into conversations (kind, title, topic, created_by) values ($1, $2, $3, $4) returning id',
    [thread.kind, thread.title ?? null, thread.topic ?? null, memberIds[0]],
  );
  const conversationId = rows[0].id;
  for (const [index, userId] of memberIds.entries()) {
    await q(
      'insert into conversation_members (conversation_id, user_id, role) values ($1, $2, $3)',
      [conversationId, userId, index === 0 ? 'owner' : 'member'],
    );
  }
  return conversationId;
}

async function addEntries(conversationId, entries, userIds) {
  const now = Date.now();
  const slotByDay = new Map();
  for (const entry of entries) {
    const slot = slotByDay.get(entry.daysAgo) ?? 0;
    slotByDay.set(entry.daysAgo, slot + 1);
    const at = new Date(now - entry.daysAgo * DAY - 30 * 60000 + slot * 120000);
    await q(
      `insert into messages (conversation_id, sender_id, body, created_at)
       values ($1, $2, $3, $4)`,
      [conversationId, userIds[entry.from], entry.body, at],
    );
  }
}

async function addNotification(userId, { source, category, title, body, conversationId, read }) {
  await q(
    `insert into notifications (user_id, source, category, title, body, conversation_id, read_at, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, now() - interval '2 hours')`,
    [userId, source, category, title, body, conversationId, read ? new Date() : null],
  );
}

export async function seed() {
  const { rows: existing } = await q('select count(*)::int as count from users');
  if (existing[0].count > 0) return;

  const passwordHash = await bcrypt.hash('unibud', 10);
  const userIds = {};
  for (const person of PEOPLE) {
    const { rows } = await q(
      `insert into users (name, handle, email, password_hash, avatar_tone, headline)
       values ($1, $2, $3, $4, $5, $6)
       returning id`,
      [person.name, person.handle, person.email, passwordHash, person.tone, person.headline],
    );
    userIds[person.key] = rows[0].id;
    for (const category of ['messages', 'lync', 'system']) {
      await q(
        'insert into notification_prefs (user_id, category, enabled) values ($1, $2, true)',
        [rows[0].id, category],
      );
    }
  }

  const conversationIds = {};
  for (const thread of THREADS) {
    const conversationId = await createConversation(thread, userIds);
    conversationIds[thread.key] = conversationId;
    await addEntries(conversationId, thread.entries, userIds);

    if (thread.unreadFor) {
      // Amara has not opened these threads yet, so the demo starts with real unread state.
      await q(
        `update conversation_members set last_read_at = now() - interval '4 hours'
          where conversation_id = $1 and user_id = $2`,
        [conversationId, userIds[thread.unreadFor]],
      );
    }

    const lync = await computeLync(conversationId);
    const reached = MILESTONES.filter((milestone) => milestone.days <= lync.streak).pop();
    if (reached) {
      await q(
        'update lync_state set celebrated_milestone = $2 where conversation_id = $1',
        [conversationId, reached.days],
      );
    }
  }

  const amara = userIds.amara;

  await addNotification(amara, {
    source: 'Chat',
    category: 'messages',
    title: 'Zara Bello',
    body: 'Deal. I will bring the sketches too.',
    conversationId: conversationIds.zara,
    read: false,
  });
  await addNotification(amara, {
    source: 'Chat',
    category: 'messages',
    title: 'Kwame Mensah · Third Floor Studio',
    body: 'Crit at four. Bring everything.',
    conversationId: conversationIds.studio,
    read: false,
  });
  await addNotification(amara, {
    source: 'Chat',
    category: 'messages',
    title: 'Tobi Adeyemi',
    body: 'They moved it to the west lecture theatre.',
    conversationId: conversationIds.tobi,
    read: true,
  });
  await addNotification(amara, {
    source: 'LYNC',
    category: 'lync',
    title: 'LYNC faded',
    body: 'Your 5-day LYNC with Imani Cole has faded. Start a new one when you are ready.',
    conversationId: conversationIds.imani,
    read: false,
  });
  await addNotification(amara, {
    source: 'UNIBUD',
    category: 'system',
    title: 'Chat, LYNC and notifications are live',
    body: 'This is the first working slice of UNIBUD. Sign in as any demo member to try a conversation.',
    conversationId: null,
    read: true,
  });

  await q('update lync_state set last_reminded_at = now() where conversation_id = $1', [
    conversationIds.imani,
  ]);

  console.log('Seeded UNIBUD demo accounts and conversations');
}
