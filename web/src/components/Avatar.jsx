const TONES = {
  ink: 'bg-ink text-paper',
  champagne: 'bg-champagneSoft text-champagne',
  moss: 'bg-moss text-paper',
  clay: 'bg-clay text-paper',
  slate: 'bg-slate text-paper',
};

const SIZES = {
  sm: 'h-9 w-9 text-[11px]',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
};

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function Avatar({ user, size = 'md', className = '' }) {
  const tone = TONES[user?.avatarTone] ?? TONES.ink;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium tracking-[0.04em] ${tone} ${SIZES[size]} ${className}`}
      aria-hidden="true"
    >
      {initials(user?.name ?? '')}
    </span>
  );
}

export function AvatarStack({ members = [], size = 'md' }) {
  const shown = members.slice(0, 2);
  if (shown.length <= 1) return <Avatar user={shown[0]} size={size} />;
  return (
    <span className="flex items-center">
      <Avatar user={shown[0]} size={size} className="ring-2 ring-paper" />
      <Avatar user={shown[1]} size={size} className="-ml-3 ring-2 ring-paper" />
    </span>
  );
}
