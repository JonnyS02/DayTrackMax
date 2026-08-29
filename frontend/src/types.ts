export type Screen =
  | 'dashboard'
  | 'login'
  | 'register'
  | 'verify-email'
  | 'forgot-password'
  | 'locked'
  | 'reset-password'
  | 'profile';

export type Birthday = {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  notifyOnBirthday: boolean;
  notifyDaysBefore: number | null;
  currentAge: number;
  nextAge: number;
  daysUntil: number;
};

export type BirthdayInput = Pick<Birthday, 'firstName' | 'lastName' | 'birthDate' | 'notifyOnBirthday' | 'notifyDaysBefore'>;

export type BirthdayList = {
  items: Birthday[];
  today: Birthday[];
  upcoming: Birthday[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    pageCount: number;
  };
};

export type User = {
  id: number;
  name: string;
  email: string;
  pendingEmail: string | null;
};
