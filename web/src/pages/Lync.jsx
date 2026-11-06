import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { timeAgo } from '../lib/time';
import LyncRing from '../components/LyncRing';
import Avatar, { AvatarStack } from '../components/Avatar';
import { ArrowIcon, FlameIcon } from '../components/Icons';

export default function Lync() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api('/lync'));
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  async function copyAchievement(item) {
    const line = `${item.streak}-day ${item.level.name} LYNC with ${item.title} · UNIBUD`;
    try {
      await navigator.clipboard.writeText(line);
      setCopied(item.conversationId);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      setCopied(null);
    }
  }

  const lyncs = data?.lyncs ?? [];
  const alive = lyncs.filter((item) => item.streak > 0);
  const resting = lyncs.filter((item) => item.streak === 0);

  return (
    <div className="pb-32">
      <header className="px-6 pt-12">
        <div className="flex items-center justify-between">
          <span className="label">UNIBUD</span>
          <span className="label">Streaks</span>
        </div>
        <h1 className="mt-7 font-serif text-[2.6rem] font-light leading-none">LYNC</h1>
        <p className="mt-3 max-w-[36ch] text-sm leading-relaxed text-soft">
          Not a separate app — the streak that lives inside your conversations. A day only counts
          when both sides actually speak.
        </p>
      </header>

      {error && <p className="px-6 pt-6 text-sm text-clay">{error}</p>}

      {data && (
        <>
          <section className="mt-7 px-6">
            <div className="flex items-baseline justify-between">
              <span className="label">Alive now</span>
              <span className="text-[11px] text-muted">{alive.length}</span>
            </div>
          </section>

          <div className="mt-3 space-y-2 px-4">
            {alive.length === 0 && (
              <div className="surface px-6 py-8 text-center">
                <p className="font-serif text-lg">No live LYNC yet.</p>
                <p className="mt-2 text-sm text-muted">
                  Reply to someone today and a streak begins — both of you have to show up.
                </p>
              </div>
            )}

            {alive.map((item) => (
              <article key={item.conversationId} className="surface animate-rise px-5 py-5">
                <div className="flex items-center gap-4">
                  <LyncRing streak={item.streak} next={item.next} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.kind === 'group' ? (
                        <AvatarStack members={item.others} size="sm" />
                      ) : (
                        <Avatar user={item.others[0]} size="sm" />
                      )}
                      <p className="truncate text-sm font-medium">{item.title}</p>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-champagne">
                      <FlameIcon className="h-3.5 w-3.5" />
                      {item.level.name}
                      <span className="text-muted">·</span>
                      <span className="text-muted">
                        {item.next ? `${item.next.days - item.streak} to ${item.next.name}` : 'Top level'}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      Best {item.bestStreak} · last message {timeAgo(item.lastMessage?.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {item.week.map((day) => (
                      <span
                        key={day.day}
                        title={day.day}
                        className={`h-2 w-2 rounded-full ${
                          day.active ? 'bg-champagne' : 'bg-line'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-[10px] uppercase tracking-[0.16em] text-muted">
                      7 days
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => copyAchievement(item)}
                      className="text-[11px] font-medium text-soft underline decoration-line underline-offset-4 transition hover:text-ink"
                    >
                      {copied === item.conversationId ? 'Copied' : 'Copy achievement'}
                    </button>
                    <Link
                      to={`/chat/${item.conversationId}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-ink"
                    >
                      Open <ArrowIcon className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {resting.length > 0 && (
            <>
              <section className="mt-9 px-6">
                <div className="flex items-baseline justify-between">
                  <span className="label">At rest</span>
                  <span className="text-[11px] text-muted">{resting.length}</span>
                </div>
              </section>
              <div className="mt-3 space-y-2 px-4">
                {resting.map((item) => (
                  <Link
                    key={item.conversationId}
                    to={`/chat/${item.conversationId}`}
                    className="flex items-center gap-3 rounded-3xl border border-line bg-white/50 px-4 py-3.5 transition hover:bg-white"
                  >
                    {item.kind === 'group' ? (
                      <AvatarStack members={item.others} size="sm" />
                    ) : (
                      <Avatar user={item.others[0]} size="sm" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-[11px] text-muted">
                        Best {item.bestStreak} day{item.bestStreak === 1 ? '' : 's'} ·{' '}
                        {item.lastMessage ? `last message ${timeAgo(item.lastMessage.createdAt)}` : 'no messages'}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-muted">Restart</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <section className="mt-10 px-6">
            <span className="label">Levels</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {(data.milestones ?? []).map((milestone) => (
                <span
                  key={milestone.days}
                  className="rounded-full border border-line bg-white/60 px-3 py-1.5 text-[11px] text-soft"
                >
                  {milestone.name} · {milestone.days}d
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Milestones arrive as a notification the first time a streak reaches them. If a LYNC
              goes quiet, UNIBUD sends one friendly reminder — never more than one a day.
            </p>
          </section>
        </>
      )}

      {!data && !error && (
        <div className="mt-8 space-y-2 px-4">
          {[0, 1].map((key) => (
            <div key={key} className="h-[124px] animate-pulse rounded-3xl bg-deeper/60" />
          ))}
        </div>
      )}
    </div>
  );
}
