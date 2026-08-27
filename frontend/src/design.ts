export const uiStyles = {
  checkbox: 'h-4 w-4 rounded border-sand-200 accent-coral-500',
  contentPadding: 'p-4 sm:p-5 lg:p-8',
  focusRing: 'outline-none transition focus:border-coral-300 focus:ring-4 focus:ring-coral-100',
  fieldLabel: 'mb-2 block text-sm font-bold text-ink',
  formStack: 'space-y-4 sm:space-y-5',
  listPadding: 'px-3 py-2.5 sm:px-4 lg:px-5 lg:py-3',
  pageTitle: 'text-3xl font-black tracking-[-0.045em] sm:text-4xl',
  textLink: 'font-bold text-coral-600 transition hover:text-plum-800',
} as const;

export const gradientStyles = {
  brand: 'bg-[linear-gradient(145deg,var(--color-plum-700)_0%,var(--color-coral-600)_58%,var(--color-peach-400)_100%)]',
  auth: 'bg-[radial-gradient(circle_at_60%_18%,var(--color-peach-200)_0%,transparent_27%),linear-gradient(150deg,var(--color-plum-800)_5%,var(--color-rose-500)_45%,var(--color-coral-500)_70%,var(--color-peach-400)_100%)]',
  featured: 'bg-[radial-gradient(circle_at_82%_-15%,var(--color-peach-200)_0%,transparent_31%),linear-gradient(115deg,var(--color-plum-700)_0%,var(--color-coral-600)_52%,var(--color-peach-400)_100%)]',
} as const;

export const birthdayColorClasses = [
  'bg-coral-100 text-coral-600',
  'bg-peach-200 text-plum-800',
  'bg-plum-100 text-plum-700',
  'bg-ocean-100 text-ocean-500',
  'bg-sand-100 text-sand-600',
] as const;
