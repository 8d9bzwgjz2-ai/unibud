import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { listTime } from '../lib/time';
import { useSession } from '../lib/session';
import Avatar, { AvatarStack } from '../components/Avatar';
import { CheckDoubleIcon, FlameIcon, SearchIcon } from '../components/Icons';

export default function ChatList() {
  const { user } = useSession();
  const [conversations, setConversations] = useState(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api('/chat/conversations');
      setConversations(data.conversations);
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 6000);
    return () => clearInterval(timer);
  }, [load]);

  const visible = useMemo(() => {
    const list = conversations ?? [];
    const needle = query.trim().toLowerCase();
    return list.filter((conversation) => {
      if (tab === 'unread' && conversation.unread === 0) return false;
      if (!needle) return true;
      return (
        conversation.title.toLowerCase().includes(needle) ||
        (conversation.lastMessage?.body ?? '').toLowerCase().includes(needle)
      );
    });
  }, [conversations, query, tab]);

  const totalUnread = (conversations ?? []).reduce((sum, item) => sum + item.unread, 0);

  return (
    <div className="pb-32">
      <header className="px-6 pt-12">
        <div className="flex items-center justify-between">
          <span className="label">UNIBUD</span>
          <Link to="/profile" aria-label="Your profile">
            <Avatar user={user} size="sm" />
          </Link>
        </div>

        <div className="mt-7 flex items-end justify-between gap-4">
          <h1 className="font-serif text-[2.6rem] font-light leading-none">Chat</h1>
          <span className="pb-1 text-[11px] text-muted">
            {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-soft">
          Conversations, group threads and the LYNC you are keeping alive.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-2.5">
          <SearchIcon className="text-muted" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
            placeholder="Search conversations"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="mt-4 flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                tab === item.key
                  ? 'bg-ink text-paper'
                  : 'border border-line bg-white/60 text-soft hover:bg-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-6 px-3">
        {error && <p className="px-3 text-sm text-clay">{error}</p>}

        {conversations === null && !error && (
          <div className="space-y-2 px-1">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-[76px] animate-pulse rounded-3xl bg-deeper/60" />
            ))}
          </div>
        )}

        {conversations !== null && visible.length === 0 && (
          <div className="surface mx-1 px-6 py-10 text-center">
            <p className="font-serif text-xl">Nothing here yet.</p>
            <p className="mt-2 text-sm text-muted">
              {tab === 'unread' ? 'No unread conversations.' : 'No conversation matches that search.'}
            </p>
          </div>
        )}

        <ul className="space-y-1.5">
          {visible.map((conversation) => {
            const last = conversation.lastMessage;
            const isGroup = conversation.kind === 'group';
            const preview = last
              ? `${
                  isGroup && last.senderId !== user.id && last.senderName
                    ? `${last.senderName.split(' ')[0]}: `
                    : ''
                }${last.body}`
              : 'No messages yet';

            return (
              <li key={conversation.id}>
                <Link
                  to={`/chat/${conversation.id}`}
                  className={`flex items-center gap-3.5 rounded-3xl border px-4 py-3.5 transition ${
                    conversation.unread > 0
                      ? 'border-champagne/40 bg-white'
                      : 'border-transparent bg-white/50 hover:border-line hover:bg-white'
                  }`}
                >
                  {isGroup ? (
                    <AvatarStack members={conversation.others} />
                  ) : (
                    <Avatar user={conversation.others[0] ?? conversation.members[0]} />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{conversation.title}</p>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-muted">
                        {listTime(last?.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <p
                        className={`truncate text-xs ${
                          conversation.unread > 0 ? 'text-soft' : 'text-muted'
                        }`}
                      >
                        {preview}
                      </p>
                      {conversation.lync?.streak > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-champagne">
                          <FlameIcon className="h-3 w-3" />
                          {conversation.lync.streak}
                        </span>
                      )}
                      {conversation.unread > 0 ? (
                        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-ink px-1.5 text-[10px] font-semibold text-paper">
                          {conversation.unread}
                        </span>
                      ) : (
                        last?.senderId === user.id && (
                          <CheckDoubleIcon className="ml-auto h-3.5 w-3.5 shrink-0 text-muted/70" />
                        )
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
