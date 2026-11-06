import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { groupLabel, timeAgo } from '../lib/time';
import { useAlerts } from '../components/AlertsContext';
import { ArrowIcon, BellIcon, ChatIcon, FlameIcon } from '../components/Icons';

const SOURCE_ICON = {
  Chat: ChatIcon,
  LYNC: FlameIcon,
  UNIBUD: BellIcon,
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'messages', label: 'Messages' },
  { key: 'lync', label: 'LYNC' },
  { key: 'system', label: 'System' },
];

export default function Notifications() {
  const navigate = useNavigate();
  const { unread, refresh } = useAlerts();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api('/notifications');
      setItems(data.notifications);
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

  const visible = useMemo(() => {
    const list = items ?? [];
    return filter === 'all' ? list : list.filter((item) => item.category === filter);
  }, [items, filter]);

  const grouped = useMemo(() => {
    const groups = [];
    for (const item of visible) {
      const label = groupLabel(item.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(item);
      else groups.push({ label, items: [item] });
    }
    return groups;
  }, [visible]);

  async function open(item) {
    if (!item.read) {
      try {
        await api(`/notifications/${item.id}/read`, { method: 'POST' });
        refresh();
      } catch {
        // Navigation still matters more than the read marker.
      }
    }
    if (item.conversationId) navigate(`/chat/${item.conversationId}`);
  }

  async function markAll() {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      await load();
      refresh();
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <div className="pb-32">
      <header className="px-6 pt-12">
        <div className="flex items-center justify-between">
          <span className="label">UNIBUD</span>
          <span className="label">One inbox</span>
        </div>

        <div className="mt-7 flex items-end justify-between gap-4">
          <h1 className="font-serif text-[2.6rem] font-light leading-none">Alerts</h1>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="pb-1 text-[11px] font-medium text-soft underline decoration-line underline-offset-4 hover:text-ink"
            >
              Mark all read
            </button>
          )}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-soft">
          Every product reports here, with its source and a link to the exact place it happened.
        </p>

        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                filter === item.key
                  ? 'bg-ink text-paper'
                  : 'border border-line bg-white/60 text-soft hover:bg-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="px-6 pt-5 text-sm text-clay">{error}</p>}

      {items === null && !error && (
        <div className="mt-6 space-y-2 px-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-20 animate-pulse rounded-3xl bg-deeper/60" />
          ))}
        </div>
      )}

      {items !== null && visible.length === 0 && (
        <div className="surface mx-4 mt-6 px-6 py-10 text-center">
          <p className="font-serif text-xl">Nothing here.</p>
          <p className="mt-2 text-sm text-muted">
            New messages, LYNC milestones and reminders will land in this one place.
          </p>
        </div>
      )}

      <div className="mt-5 space-y-7 px-4">
        {grouped.map((group) => (
          <section key={group.label}>
            <div className="flex items-baseline justify-between px-2">
              <span className="label">{group.label}</span>
              <span className="text-[10px] text-muted">{group.items.length}</span>
            </div>

            <ul className="mt-3 space-y-1.5">
              {group.items.map((item) => {
                const Icon = SOURCE_ICON[item.source] ?? BellIcon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => open(item)}
                      className={`flex w-full items-start gap-3 rounded-3xl border px-4 py-3.5 text-left transition ${
                        item.read
                          ? 'border-transparent bg-white/45 hover:border-line hover:bg-white'
                          : 'border-champagne/35 bg-white shadow-lift'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          item.category === 'lync'
                            ? 'bg-champagneSoft text-champagne'
                            : 'bg-deeper text-soft'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
                            {item.source}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted">
                            {timeAgo(item.createdAt)}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-sm font-medium">{item.title}</span>
                        {item.body && (
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-soft">
                            {item.body}
                          </span>
                        )}
                      </span>

                      {!item.read && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-champagne" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-9 px-6">
        <Link
          to="/profile"
          className="flex items-center justify-between rounded-3xl border border-line bg-white/50 px-4 py-3.5 text-sm transition hover:bg-white"
        >
          <span>
            <span className="block font-medium">Notification preferences</span>
            <span className="mt-0.5 block text-[11px] text-muted">
              Messages, LYNC reminders and system notices
            </span>
          </span>
          <ArrowIcon className="h-4 w-4 text-muted" />
        </Link>
      </div>
    </div>
  );
}
