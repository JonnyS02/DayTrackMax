import type { Birthday } from './types';

const millisecondsPerDay = 86_400_000;
const reminderDateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function fullName(birthday: Birthday) {
  return `${birthday.firstName} ${birthday.lastName}`.trim();
}

export function initials(birthday: Birthday) {
  return `${birthday.firstName[0] ?? ''}${birthday.lastName[0] ?? ''}`.toUpperCase();
}

export function userInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function birthdayDateLabel(birthDate: string) {
  const [, month, day] = birthDate.split('-').map(Number);
  return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' }).format(new Date(2000, month - 1, day));
}

export function nextReminderDateLabel(birthDate: string, daysBefore: number | null, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match || daysBefore === null || daysBefore < 1 || daysBefore > 365) return null;

  const month = Number(match[2]);
  const day = Number(match[3]);
  const todayTimestamp = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const occurrence = (year: number): number => Date.UTC(year, month - 1, day);

  for (let year = today.getFullYear(); year <= today.getFullYear() + 8; year++) {
    const reminderTimestamp: number = occurrence(year) - daysBefore * millisecondsPerDay;
    if (reminderTimestamp < todayTimestamp) continue;

    const reminderYear = new Date(reminderTimestamp).getUTCFullYear();
    const thisYearOccurrence = occurrence(reminderYear);
    const nextOccurrence: number = thisYearOccurrence < reminderTimestamp ? occurrence(reminderYear + 1) : thisYearOccurrence;
    if ((nextOccurrence - reminderTimestamp) / millisecondsPerDay === daysBefore) {
      return reminderDateFormatter.format(new Date(reminderTimestamp));
    }
  }

  return null;
}
