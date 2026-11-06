const DAY = 86400000;

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function clock(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function dayLabel(value) {
  const date = new Date(value);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function listTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY);
  if (diff <= 0) return clock(date);
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function groupLabel(value) {
  const date = new Date(value);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'Earlier this week';
  return 'Earlier';
}

export function sameDay(a, b) {
  return startOfDay(new Date(a)) === startOfDay(new Date(b));
}
