import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { clock, dayLabel, sameDay } from '../lib/time';
import { useSession } from '../lib/session';
import Avatar from '../components/Avatar';
import {
  BackIcon,
  CheckDoubleIcon,
  CheckIcon,
  FlameIcon,
  SendIcon,
} from '../components/Icons';

export default function Conversation() {
  const { id } = useParams();
  const { user } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const endRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const payload = await api(`/chat/conversations/${id}`);
      setData(payload);
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }, [id]);

  useEffect(() => {
    setData(null);
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [load]);

  const messages = data?.messages ?? [];

  useEffect(() => {
    // Wait for the new bubble to be painted, then sit above the fixed composer.
    const frame = requestAnimationFrame(() => {
      // Scroll the document itself: the thread's bottom padding keeps the last
      // bubble clear of the fixed composer, which a plain scrollIntoView ignores.
      window.scrollTo({ top: document.documentElement.scrollHeight });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages.length]);

  useEffect(() => {
    if (!celebration) return undefined;
    const timer = setTimeout(() => setCelebration(null), 6000);
    return () => clearTimeout(timer);
  }, [celebration]);

  const receipt = useMemo(() => {
    if (!data) return null;
    const mine = [...messages].reverse().find((message) => message.senderId === user.id);
    if (!mine) return null;
    const others = data.members.filter((member) => member.id !== user.id);
    if (!others.length) return { mine, read: false };
    const earliestRead = Math.min(...others.map((member) => new Date(member.lastReadAt).getTime()));
    return { mine, read: earliestRead >= new Date(mine.createdAt).getTime() };
  }, [data, messages, user.id]);

  async function send(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const response = await api(`/chat/conversations/${id}/messages`, {
        method: 'POST',
        body: { body },
      });
      setDraft('');
      if (response.milestone) setCelebration(response.milestone);
      await load();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSending(false);
    }
  }

  if (error && !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <p className="font-serif text-2xl">This conversation is not available.</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <Link to="/chat" className="btn-ghost mt-6">
          Back to Chat
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="label animate-pulse">Opening conversation</span>
      </div>
    );
  }

  const { conversation, members, lync } = data;
  const isGroup = conversation.kind === 'group';
  const others = members.filter((member) => member.id !== user.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            aria-label="Back to conversations"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white/70 text-ink"
          >
            <BackIcon />
          </Link>

          {isGroup ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{conversation.title}</p>
              <p className="truncate text-[11px] text-muted">
                {members.length} members · {conversation.topic ?? 'open conversation'}
              </p>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar user={others[0]} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{conversation.title}</p>
                <p className="truncate text-[11px] text-muted">@{others[0]?.handle}</p>
              </div>
            </div>
          )}

          <Link
            to="/lync"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-champagne/40 bg-champagneSoft/60 px-3 py-1.5 text-[11px] font-medium text-champagne"
            aria-label="Open LYNC"
          >
            <FlameIcon className="h-3.5 w-3.5" />
            {lync.streak}
          </Link>
        </div>
      </header>

      {celebration && (
        <div className="animate-rise border-b border-champagne/30 bg-champagneSoft/70 px-5 py-2.5 text-center text-[12px] text-champagne">
          <span className="font-medium">{celebration.name} reached.</span>{' '}
          {celebration.note}
        </div>
      )}

      <div className="flex-1 px-4 pb-36 pt-4">
        <div className="mx-auto mb-5 max-w-[36ch] text-center text-[11px] leading-relaxed text-muted">
          {isGroup
            ? `Group LYNC · ${lync.streak} day${lync.streak === 1 ? '' : 's'} · a day counts when two people reply`
            : `Personal LYNC · ${lync.streak} day${lync.streak === 1 ? '' : 's'} · both of you keep it alive`}
        </div>

        <div className="space-y-1.5">
          {messages.map((message, index) => {
            const mine = message.senderId === user.id;
            const previous = messages[index - 1];
            const showDay = !previous || !sameDay(previous.createdAt, message.createdAt);
            const showSender =
              isGroup &&
              !mine &&
              (!previous || previous.senderId !== message.senderId || showDay);
            const isLastMine =
              receipt && receipt.mine.id === message.id;

            return (
              <div key={message.id}>
                {showDay && (
                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-muted">
                      {dayLabel(message.createdAt)}
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}

                {message.kind === 'system' ? (
                  <p className="my-2 text-center text-[11px] text-muted">{message.body}</p>
                ) : (
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'}`}>
                      {showSender && (
                        <p className="mb-1 pl-1 text-[10px] uppercase tracking-[0.14em] text-muted">
                          {message.senderName}
                        </p>
                      )}
                      <div
                        className={`whitespace-pre-wrap break-words px-4 py-2.5 text-[13.5px] leading-relaxed ${
                          mine
                            ? 'rounded-[20px] rounded-br-[6px] bg-ink text-paper'
                            : 'rounded-[20px] rounded-bl-[6px] border border-line bg-white text-ink'
                        }`}
                      >
                        {message.body}
                      </div>
                      <div
                        className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-muted ${
                          mine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>{clock(message.createdAt)}</span>
                        {isLastMine &&
                          (receipt.read ? (
                            <span className="flex items-center gap-1 text-champagne">
                              <CheckDoubleIcon className="h-3 w-3" /> Read
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <CheckIcon className="h-3 w-3" /> Delivered
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-[560px] -translate-x-1/2 border-t border-line bg-paper/95 px-4 pb-5 pt-3 backdrop-blur"
      >
        <div className="flex items-end gap-2">
          <input
            className="field bg-white"
            placeholder={`Message ${conversation.title}…`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition disabled:bg-line disabled:text-muted"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
        {error && <p className="mt-2 text-[11px] text-clay">{error}</p>}
      </form>
    </div>
  );
}
