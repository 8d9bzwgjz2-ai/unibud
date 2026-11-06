import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, q } from './db.js';
import authRoutes, { attachUser } from './auth.js';
import chatRoutes from './routes/chat.js';
import lyncRoutes from './routes/lync.js';
import notificationRoutes from './routes/notifications.js';
import { seed } from './seed.js';
import { runLyncReminders } from './services/lync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', async (_req, res) => {
  try {
    await q('select 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/lync', lyncRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error, _req, res, _next) => {
  console.error('[api]', error);
  res.status(500).json({ error: 'Something went wrong on our side.' });
});

async function migrate() {
  await q(
    `create table if not exists schema_migrations (
       name text primary key,
       applied_at timestamptz not null default now()
     )`,
  );
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rowCount } = await q('select 1 from schema_migrations where name = $1', [file]);
    if (rowCount) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
      console.log(`[db] applied ${file}`);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}

async function waitForDatabase() {
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    try {
      await q('select 1');
      return;
    } catch (error) {
      if (attempt === 40) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

async function start() {
  await waitForDatabase();
  await migrate();
  await seed();

  app.listen(PORT, '0.0.0.0', () => console.log(`[api] UNIBUD api listening on ${PORT}`));

  const remind = () =>
    runLyncReminders().catch((error) => console.error('[lync] reminder failed', error));
  remind();
  setInterval(remind, 60000);
}

start().catch((error) => {
  console.error('[api] failed to start', error);
  process.exit(1);
});
