const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function ChatIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M21 11.6a8.4 8.4 0 0 1-8.5 8.4 9 9 0 0 1-3.7-.8L3.5 21l1.8-5a8.2 8.2 0 0 1-.8-3.6A8.4 8.4 0 0 1 13 3h.4a8.4 8.4 0 0 1 7.6 8.6Z" />
    </svg>
  );
}

export function FlameIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M12 21c3.4 0 6-2.4 6-5.6 0-4.6-6-12.4-6-12.4S6 10.8 6 15.4C6 18.6 8.6 21 12 21Z" />
      <path d="M12 21c1.6 0 2.8-1.1 2.8-2.6 0-2-2.8-5.2-2.8-5.2s-2.8 3.2-2.8 5.2c0 1.5 1.2 2.6 2.8 2.6Z" />
    </svg>
  );
}

export function BellIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6.2-2.5 7.5-2.5 7.5h17S18 14.7 18 8.5Z" />
      <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function UserIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.6-3.6 3.7-5.6 7.5-5.6s6.9 2 7.5 5.6" />
    </svg>
  );
}

export function SendIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M4 12 20 4l-4.5 16-4.2-6.3L4 12Z" />
      <path d="M11.3 13.7 20 4" />
    </svg>
  );
}

export function BackIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M14.5 19 7.5 12l7-7" />
    </svg>
  );
}

export function SearchIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function CheckIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function CheckDoubleIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="m2 12.5 4 4L15 7" />
      <path d="m9 16.5 1 1L21 7" />
    </svg>
  );
}

export function ArrowIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
