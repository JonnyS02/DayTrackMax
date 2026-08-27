import { BellRing, CalendarDays } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { ReactNode } from 'react';
import { formErrors } from '../api';
import { uiStyles } from '../design';
import type { Birthday, BirthdayInput } from '../types';
import { cn } from '../utils';
import { Button, Field, FormError, Modal } from './ui';

const emptyBirthday: BirthdayInput = {
  firstName: '',
  lastName: '',
  birthDate: '',
  notifyOnBirthday: true,
  notifyDaysBefore: null,
};

function getInitialValues(birthday: Birthday | null): BirthdayInput {
  if (!birthday) return { ...emptyBirthday };
  return {
    firstName: birthday.firstName,
    lastName: birthday.lastName,
    birthDate: birthday.birthDate,
    notifyOnBirthday: birthday.notifyOnBirthday,
    notifyDaysBefore: birthday.notifyDaysBefore,
  };
}

const reminderIconStyles = {
  coral: 'bg-coral-100 text-coral-600',
  peach: 'bg-peach-200 text-plum-800',
} as const;

function ReminderToggle({ label, tone, checked, onChange, children }: { label: string; tone: keyof typeof reminderIconStyles; checked: boolean; onChange: (checked: boolean) => void; children?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-sand-200 bg-sand-50 sm:rounded-2xl">
      <label className="flex cursor-pointer items-center justify-between gap-3 p-3 sm:gap-4 sm:p-4">
        <span className="flex items-center gap-3">
          <span className={cn('grid h-10 w-10 place-items-center rounded-xl', reminderIconStyles[tone])}><BellRing size={18} /></span>
          <span className="block text-sm font-bold text-ink">{label}</span>
        </span>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-coral-500" />
      </label>
      {checked && children}
    </div>
  );
}

export function BirthdayForm({ birthday, onClose, onSave }: { birthday: Birthday | null; onClose: () => void; onSave: (birthday: BirthdayInput) => Promise<void> }) {
  const [form, setForm] = useState<BirthdayInput>(() => getInitialValues(birthday));
  const [feedback, setFeedback] = useState({ message: '', fields: {} as Record<string, string> });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const update = <Key extends keyof BirthdayInput>(key: Key, value: BirthdayInput[Key]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback({ message: '', fields: {} });
    setIsSubmitting(true);
    try {
      await onSave(form);
    } catch (submitError) {
      setFeedback(formErrors(submitError, ['firstName', 'lastName', 'birthDate']));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={birthday ? 'Geburtstag bearbeiten' : 'Geburtstag hinzufügen'} onClose={onClose}>
      <form onSubmit={submit} className={uiStyles.formStack}>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Field id="first-name" label="Vorname" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} placeholder="Max" error={feedback.fields.firstName} required />
          <Field id="last-name" label="Nachname" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} placeholder="Mustermann" error={feedback.fields.lastName} />
        </div>
        <Field id="birth-date" label="Geburtsdatum" type="date" value={form.birthDate} onChange={(event) => update('birthDate', event.target.value)} icon={<CalendarDays size={17} />} error={feedback.fields.birthDate} required />
        <ReminderToggle label="E-Mail am Geburtstag" tone="coral" checked={form.notifyOnBirthday} onChange={(checked) => update('notifyOnBirthday', checked)} />
        <ReminderToggle label="Vorab erinnern" tone="peach" checked={form.notifyDaysBefore !== null} onChange={(checked) => update('notifyDaysBefore', checked ? 7 : null)}>
          <label className="flex items-center gap-2 border-t border-sand-200 px-3 py-2.5 text-sm text-stone-500 sm:px-4 sm:py-3">
            <input type="number" min="1" max="365" value={form.notifyDaysBefore ?? 7} onChange={(event) => update('notifyDaysBefore', Math.max(1, Number(event.target.value)))} className={cn('h-9 w-16 rounded-xl border border-sand-200 bg-white px-2 text-center font-bold text-ink', uiStyles.focusRing)} aria-label="Vorab-Erinnerung in Tagen" />
            <span>{form.notifyDaysBefore === 1 ? 'Tag vorher' : 'Tage vorher'}</span>
          </label>
        </ReminderToggle>
        <FormError message={feedback.message} />
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Speichert …' : birthday ? 'Speichern' : 'Anlegen'}</Button>
        </div>
      </form>
    </Modal>
  );
}
