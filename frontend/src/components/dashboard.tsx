import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, ChevronLeft, ChevronRight, LogOut, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, errorMessage } from '../api';
import { birthdayColorClasses, gradientStyles, uiStyles } from '../design';
import type { Birthday, BirthdayInput, BirthdayList, User } from '../types';
import { birthdayDateLabel, cn, fullName, initials, userInitials } from '../utils';
import { BirthdayForm } from './birthday-form';
import { useApp } from './app-context';
import { AppHeader, AppShell, Button, Footer, HeaderAction, IconButton, LanguageSwitch, Modal, PageContainer, PageHeading, SearchField, Select, Surface } from './ui';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const emptyList: BirthdayList = { items: [], today: [], upcoming: [], meta: { page: 1, perPage: 5, total: 0, pageCount: 1 } };

function BirthdayHighlights({ birthdays, variant, onSelect }: { birthdays: Birthday[]; variant: 'today' | 'upcoming'; onSelect: (birthday: Birthday) => void }) {
  const { copy } = useApp();
  if (birthdays.length === 0) return null;

  const isToday = variant === 'today';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative mb-4 overflow-hidden rounded-3xl px-3 py-2.5 text-white shadow-xl sm:mb-6 sm:rounded-[2rem] sm:px-4 lg:px-6 lg:py-3',
        isToday ? 'shadow-coral-500/15' : 'shadow-ocean-500/15',
        isToday ? gradientStyles.featuredToday : gradientStyles.featuredUpcoming,
      )}
    >
      <div className="pointer-events-none absolute -bottom-12 right-8 h-28 w-72 rounded-[50%] border border-white/20" />
      <div className="pointer-events-none absolute -bottom-16 right-2 h-28 w-80 rounded-[50%] border border-white/15" />
      <div className="relative divide-y divide-white/15">
        {birthdays.map((birthday) => {
          const timing = copy.dashboard.timing(birthday.daysUntil);
          const highlight = copy.dashboard.highlight(fullName(birthday), birthday.nextAge, timing);
          return (
            <button key={birthday.id} onClick={() => onSelect(birthday)} className="flex w-full items-center gap-2.5 py-2.5 text-left sm:gap-4 sm:py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand-50/15 text-sm font-black ring-1 ring-white/20 sm:h-12 sm:w-12 sm:text-base">{initials(birthday)}</span>
              <span className="min-w-0 flex-1 text-lg font-black tracking-tight sm:text-2xl">{highlight.before}<span className={isToday ? 'text-peach-200' : 'text-ocean-100'}>{highlight.timing}</span>{highlight.after}</span>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}

export function Dashboard() {
  const { clearUserLocale, copy, locale, navigate, showToast, syncUserLocale } = useApp();
  const [user, setUser] = useState<User | null>(null);
  const [birthdays, setBirthdays] = useState<BirthdayList>(emptyList);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(PAGE_SIZE_OPTIONS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null);
  const [deleting, setDeleting] = useState<Birthday | null>(null);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      navigate('login');
      return;
    }
    showToast(errorMessage(error));
  }, [navigate, showToast]);

  const loadBirthdays = useCallback(async () => {
    const result = await api.listBirthdays(query, page, pageSize);
    setBirthdays(result);
    if (result.meta.page !== page) setPage(result.meta.page);
  }, [page, pageSize, query]);

  useEffect(() => {
    let active = true;
    api.getProfile().then((profile) => {
      if (!active) return;
      setUser(profile);
      syncUserLocale(profile.locale);
    }).catch((error) => active && handleError(error));
    return () => { active = false; };
  }, [handleError, syncUserLocale]);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      setIsLoading(true);
      api.listBirthdays(query, page, pageSize)
        .then((result) => {
          if (!active) return;
          setBirthdays(result);
          if (result.meta.page !== page) setPage(result.meta.page);
        })
        .catch((error) => active && handleError(error))
        .finally(() => active && setIsLoading(false));
    }, query ? 200 : 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [handleError, page, pageSize, query]);

  const saveBirthday = async (input: BirthdayInput) => {
    if (editingBirthday) await api.updateBirthday(editingBirthday.id, input);
    else await api.createBirthday(input);
    await loadBirthdays();
    setIsFormOpen(false);
    setEditingBirthday(null);
    showToast(editingBirthday ? copy.dashboard.saved : copy.dashboard.added);
  };

  const openBirthdayForm = (birthday: Birthday | null) => {
    setEditingBirthday(birthday);
    setIsFormOpen(true);
  };

  const closeBirthdayForm = () => {
    setIsFormOpen(false);
    setEditingBirthday(null);
  };

  const removeBirthday = async () => {
    if (!deleting) return;
    try {
      await api.deleteBirthday(deleting.id);
      await loadBirthdays();
      setDeleting(null);
      showToast(copy.dashboard.deleted);
    } catch (error) {
      handleError(error);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      clearUserLocale();
      navigate('login');
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <AppShell>
      <AppHeader>
        <SearchField value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} wrapperClassName="hidden w-56 md:block lg:w-72" placeholder={copy.dashboard.search} aria-label={copy.dashboard.searchLabel} />
        <LanguageSwitch disabled={user === null} />
        <HeaderAction variant="accent" label={copy.dashboard.openProfile} text={copy.dashboard.profile} onClick={() => navigate('profile')}><span className="text-xs font-black">{user ? userInitials(user.name) : ''}</span></HeaderAction>
        <HeaderAction label={copy.common.logout} text={copy.common.logout} onClick={logout}><LogOut size={17} /></HeaderAction>
      </AppHeader>

      <PageContainer>
        <PageHeading title={copy.dashboard.title} action={<Button onClick={() => openBirthdayForm(null)}><Plus size={17} /> <span className="hidden sm:inline">{copy.dashboard.add}</span></Button>} />

        <BirthdayHighlights birthdays={birthdays.today} variant="today" onSelect={openBirthdayForm} />
        <BirthdayHighlights birthdays={birthdays.upcoming} variant="upcoming" onSelect={openBirthdayForm} />

        <SearchField value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} wrapperClassName="mb-4 md:hidden" placeholder={copy.dashboard.search} aria-label={copy.dashboard.searchLabel} />

        <Surface className="overflow-hidden shadow-plum-800/5">
          <div className={cn('flex items-center justify-between gap-2 border-b border-sand-200 sm:gap-3', uiStyles.listPadding)}>
            <h2 className="font-black">{copy.dashboard.all}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-stone-400">{birthdays.meta.total}</span>
              <Select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]); setPage(1); }} aria-label={copy.dashboard.entriesPerPage}>
                {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{copy.dashboard.perPage(size)}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <motion.div key={`${birthdays.meta.page}-${pageSize}-${query}`} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.14, ease: 'easeOut' }} className="divide-y divide-sand-100">
              {birthdays.items.map((birthday) => {
                const hasReminder = birthday.notifyOnBirthday || birthday.notifyDaysBefore !== null;
                const daysLabel = copy.dashboard.days(birthday.daysUntil);
                return (
                  <article key={birthday.id} className={cn('group flex items-center gap-2 transition hover:bg-sand-50 sm:gap-3', uiStyles.listPadding)}>
                    <button onClick={() => openBirthdayForm(birthday)} className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black sm:h-11 sm:w-11 sm:rounded-2xl', birthdayColorClasses[(birthday.id - 1) % birthdayColorClasses.length])}>{initials(birthday)}</button>
                    <button onClick={() => openBirthdayForm(birthday)} className="min-w-0 flex-1 text-left md:flex md:items-center md:gap-5">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate font-bold">{fullName(birthday)}</span>
                        <span className="shrink-0 text-xs font-bold text-stone-500 sm:text-sm">{copy.dashboard.age(birthday.currentAge)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm font-bold text-sand-600 md:ml-auto md:mt-0 md:shrink-0 md:text-base">{birthdayDateLabel(birthday.birthDate, locale)}</span>
                    </button>
                    <span className={hasReminder ? 'text-ocean-500' : 'text-stone-300'}>{hasReminder ? <Bell size={15} /> : <BellOff size={15} />}</span>
                    <span className={`hidden min-w-20 text-right text-sm font-bold sm:block lg:min-w-24 ${birthday.daysUntil === 0 ? 'text-coral-600' : 'text-sand-600'}`}>{daysLabel}</span>
                    <div className="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <IconButton onClick={() => openBirthdayForm(birthday)} variant="warm" label={copy.dashboard.editBirthday(fullName(birthday))}><Pencil size={15} /></IconButton>
                      <IconButton onClick={() => setDeleting(birthday)} variant="danger" label={copy.dashboard.deleteBirthday(fullName(birthday))}><Trash2 size={15} /></IconButton>
                    </div>
                  </article>
                );
              })}
            </motion.div>
            {!isLoading && birthdays.meta.total === 0 && <div className="px-4 py-8 text-center text-sm font-bold text-stone-400">{copy.dashboard.noResults}</div>}
            {isLoading && <div className="px-4 py-8 text-center text-sm font-bold text-stone-400">{copy.dashboard.loading}</div>}
          </div>
          {birthdays.meta.total > 0 && birthdays.meta.pageCount > 1 && (
            <div className={cn('flex items-center justify-between border-t border-sand-200', uiStyles.listPadding)}>
              <span className="text-xs font-bold text-stone-400">{copy.dashboard.page(birthdays.meta.page, birthdays.meta.pageCount)}</span>
              <div className="flex gap-1.5">
                <IconButton onClick={() => setPage(birthdays.meta.page - 1)} disabled={birthdays.meta.page === 1} variant="outlined" label={copy.dashboard.previousPage}><ChevronLeft size={17} /></IconButton>
                <IconButton onClick={() => setPage(birthdays.meta.page + 1)} disabled={birthdays.meta.page === birthdays.meta.pageCount} variant="outlined" label={copy.dashboard.nextPage}><ChevronRight size={17} /></IconButton>
              </div>
            </div>
          )}
        </Surface>
      </PageContainer>

      <Footer />
      <AnimatePresence>{isFormOpen && <BirthdayForm birthday={editingBirthday} onClose={closeBirthdayForm} onSave={saveBirthday} />}</AnimatePresence>
      <AnimatePresence>{deleting && <Modal title={copy.dashboard.deleteTitle(fullName(deleting))} onClose={() => setDeleting(null)} size="sm"><div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setDeleting(null)}>{copy.common.cancel}</Button><Button variant="danger" onClick={removeBirthday}><Trash2 size={16} /> {copy.common.delete}</Button></div></Modal>}</AnimatePresence>
    </AppShell>
  );
}
