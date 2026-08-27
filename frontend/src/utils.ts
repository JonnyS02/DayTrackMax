import type { Birthday } from './types';

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
