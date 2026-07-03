// Time slots the restaurant serves. Kept short here; in a real system this
// would come from an admin config endpoint.
export const TIME_SLOTS = [
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
];

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateLong(date: string) {
  // "2026-12-01" → "Tue, Dec 1, 2026"
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(time: string) {
  // "19:00" → "7:00 PM"
  const [h, m] = time.split(':').map(Number);
  const dt = new Date(2000, 0, 1, h, m);
  return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
