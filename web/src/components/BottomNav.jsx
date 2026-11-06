import { NavLink } from 'react-router-dom';
import { BellIcon, ChatIcon, FlameIcon, UserIcon } from './Icons';
import { useAlerts } from './AlertsContext';

const ITEMS = [
  { to: '/chat', label: 'Chat', Icon: ChatIcon },
  { to: '/lync', label: 'LYNC', Icon: FlameIcon },
  { to: '/notifications', label: 'Alerts', Icon: BellIcon },
  { to: '/profile', label: 'You', Icon: UserIcon },
];

export default function BottomNav({ hidden = false }) {
  const { unread } = useAlerts();

  return (
    <nav
      className={`fixed bottom-5 left-1/2 z-40 -translate-x-1/2 transition-transform duration-300 ${
        hidden ? 'translate-y-28' : 'translate-y-0'
      }`}
      aria-label="Primary"
    >
      <div className="flex items-center gap-1 rounded-full bg-ink p-1.5 shadow-lift">
        {ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium transition ${
                isActive ? 'bg-paper text-ink' : 'text-paper/65 hover:text-paper'
              }`
            }
          >
            <span className="relative">
              <Icon className="h-[18px] w-[18px]" />
              {label === 'Alerts' && unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-champagne px-1 text-[9px] font-semibold text-ink">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
