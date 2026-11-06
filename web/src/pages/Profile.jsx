import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import Avatar from '../components/Avatar';

const OPTIONS = [
  {
    key: 'messages',
    title: 'Messages',
    description: 'A new message in any conversation. One live alert per thread.',
  },
  {
    key: 'lync',
    title: 'LYNC',
    description: 'Milestones, levels reached and one friendly reminder when a streak goes quiet.',
  },
  {
    key: 'system',
    title: 'System',
    description: 'Platform notices about UNIBUD itself — security, access and new capabilities.',
  },
];

export default function Profile() {
  const { user, signOut } = useSession();
  const [prefs, setPrefs] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api('/notifications/prefs')
      .then((data) => setPrefs(data.prefs))
      .catch((failure) => setError(failure.message));
  }, []);

  const toggle = useCallback(
    async (key) => {
      if (!prefs) return;
      const next = !prefs[key];
      setPrefs({ ...prefs, [key]: next });
      setSaving(key);
      try {
        const data = await api('/notifications/prefs', {
          method: 'PUT',
          body: { [key]: next },
        });
        setPrefs(data.prefs);
        setError('');
      } catch (failure) {
        setPrefs((current) => ({ ...current, [key]: !next }));
        setError(failure.message);
      } finally {
        setSaving(null);
      }
    },
    [prefs],
  );

  return (
    <div className="pb-32">
      <header className="px-6 pt-12">
        <div className="flex items-center justify-between">
          <span className="label">UNIBUD</span>
          <span className="label">You</span>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate font-serif text-3xl font-light leading-tight">{user.name}</h1>
            <p className="mt-1 text-xs text-muted">@{user.handle}</p>
            {user.headline && <p className="mt-1 text-[11px] text-muted">{user.headline}</p>}
          </div>
        </div>
      </header>

      <section className="mt-9 px-4">
        <div className="px-2">
          <span className="label">Notification preferences</span>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            One inbox, but you decide what reaches it. Turning a category off stops those alerts
            from being created at all.
          </p>
        </div>

        <div className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white/60">
          {OPTIONS.map((option) => {
            const enabled = prefs?.[option.key] ?? true;
            return (
              <div key={option.key} className="flex items-start gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{option.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{option.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${option.title} notifications`}
                  onClick={() => toggle(option.key)}
                  disabled={!prefs || saving === option.key}
                  className={`mt-1 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                    enabled ? 'bg-ink' : 'bg-line'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-paper shadow transition ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 px-2 text-[11px] text-clay">{error}</p>}
      </section>

      <section className="mt-8 px-4">
        <div className="rounded-3xl border border-line bg-white/40 px-5 py-4">
          <span className="label">This build</span>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Chat, LYNC and the single notification system, on persistent data. Square, Connect,
            Quad and the connected experiences are not part of this slice yet.
          </p>
        </div>
      </section>

      <div className="mt-8 px-4">
        <button type="button" onClick={signOut} className="btn-ghost w-full">
          Sign out
        </button>
      </div>
    </div>
  );
}
