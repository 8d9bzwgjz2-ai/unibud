import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Avatar from '../components/Avatar';
import { ArrowIcon } from '../components/Icons';

export default function Login({ onSignedIn }) {
  const [accounts, setAccounts] = useState([]);
  const [demoPassword, setDemoPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/auth/demo-accounts')
      .then((data) => {
        setAccounts(data.accounts ?? []);
        setDemoPassword(data.password ?? '');
      })
      .catch(() => {});
  }, []);

  async function signIn(nextEmail, nextPassword) {
    setBusy(true);
    setError('');
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email: nextEmail, password: nextPassword },
      });
      onSignedIn(data.user);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-6 pb-12 pt-14">
      <div className="flex items-center justify-between">
        <span className="label">UNIBUD</span>
        <span className="label">Conversations</span>
      </div>

      <header className="mt-8 animate-rise">
        <h1 className="font-serif text-[2.7rem] font-light leading-[1.02] tracking-[-0.01em]">
          Chat, LYNC and
          <br />
          one honest inbox.
        </h1>
        <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-soft">
          Sign in to pick up a conversation. Every message, streak and alert lives in one place —
          no separate notification centres.
        </p>
      </header>

      <form
        className="mt-10 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          signIn(email.trim(), password);
        }}
      >
        <label className="block">
          <span className="label">Email</span>
          <input
            className="field mt-2"
            type="email"
            autoComplete="email"
            placeholder="you@unibud.app"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input
            className="field mt-2"
            type="password"
            autoComplete="current-password"
            placeholder="••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="text-sm text-clay">{error}</p>}
        <button className="btn-ink w-full" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
          {!busy && <ArrowIcon />}
        </button>
      </form>

      <div className="mt-10">
        <div className="flex items-baseline justify-between">
          <span className="label">Demo members</span>
          <span className="text-[11px] text-muted">one tap signs you in</span>
        </div>
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white/70">
          {accounts.map((account) => (
            <button
              key={account.handle}
              type="button"
              onClick={() => signIn(account.email, demoPassword)}
              disabled={busy}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white"
            >
              <Avatar user={account} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{account.name}</span>
                <span className="block truncate text-xs text-muted">{account.headline}</span>
              </span>
              <ArrowIcon className="h-4 w-4 text-muted" />
            </button>
          ))}
        </div>
        {demoPassword && (
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Shared demo password: <span className="font-medium text-soft">{demoPassword}</span>. These
            are seeded accounts for reviewing the build, not production identities.
          </p>
        )}
      </div>
    </div>
  );
}
