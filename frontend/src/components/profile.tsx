import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, KeyRound, LogOut, Mail, Save, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError, errorMessage, formErrors } from '../api';
import { uiStyles } from '../design';
import type { Screen } from '../types';
import { cn } from '../utils';
import { AppHeader, AppShell, Button, Field, Footer, FormError, HeaderAction, Modal, PageContainer, PageHeading, Surface } from './ui';

export function Profile({ onNavigate, showToast }: { onNavigate: (screen: Screen) => void; showToast: (message: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [activeEmail, setActiveEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [profileFeedback, setProfileFeedback] = useState({ message: '', fields: {} as Record<string, string> });
  const [passwordError, setPasswordError] = useState('');
  const [deleteFeedback, setDeleteFeedback] = useState({ message: '', fields: {} as Record<string, string> });
  const [isSaving, setIsSaving] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isRequestingPasswordChange, setIsRequestingPasswordChange] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const redirectIfUnauthorized = useCallback((requestError: unknown) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      if (requestError.code === 'REAUTHENTICATION_REQUIRED') showToast(requestError.message);
      onNavigate('login');
      return true;
    }

    return false;
  }, [onNavigate, showToast]);

  useEffect(() => {
    api.getProfile()
      .then((user) => {
        setName(user.name);
        setEmail(user.pendingEmail ?? user.email);
        setActiveEmail(user.email);
        setPendingEmail(user.pendingEmail);
      })
      .catch((requestError) => {
        if (!redirectIfUnauthorized(requestError)) {
          setProfileFeedback({ message: errorMessage(requestError), fields: {} });
        }
      });
  }, [redirectIfUnauthorized]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const emailChangeRequested = requiresPassword;
    setProfileFeedback({ message: '', fields: {} });
    setIsSaving(true);
    try {
      const user = await api.updateProfile(name, email, currentPassword);
      setName(user.name);
      setEmail(user.pendingEmail ?? user.email);
      setActiveEmail(user.email);
      setPendingEmail(user.pendingEmail);
      setCurrentPassword('');
      showToast(emailChangeRequested ? 'Bestätigungslink gesendet' : 'Profil gespeichert');
    } catch (requestError) {
      if (!redirectIfUnauthorized(requestError)) {
        setProfileFeedback(formErrors(requestError, ['name', 'email', 'currentPassword']));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const resendEmailVerification = async () => {
    if (!pendingEmail) return;

    setProfileFeedback({ message: '', fields: {} });
    setIsResendingVerification(true);
    try {
      await api.requestEmailVerification(pendingEmail);
      showToast('Bestätigungslink erneut gesendet');
    } catch (requestError) {
      if (!redirectIfUnauthorized(requestError)) {
        setProfileFeedback({ message: errorMessage(requestError), fields: {} });
      }
    } finally {
      setIsResendingVerification(false);
    }
  };

  const requestPasswordChange = async () => {
    setPasswordError('');
    setIsRequestingPasswordChange(true);
    try {
      await api.requestPasswordChange();
      showToast('Verifizierungslink gesendet');
    } catch (requestError) {
      if (!redirectIfUnauthorized(requestError)) setPasswordError(errorMessage(requestError));
    } finally {
      setIsRequestingPasswordChange(false);
    }
  };

  const deleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeleteFeedback({ message: '', fields: {} });
    setIsDeleting(true);
    const password = new FormData(event.currentTarget).get('password');
    try {
      await api.deleteAccount(String(password ?? ''));
      setIsDeleteDialogOpen(false);
      onNavigate('login');
      showToast('Konto erfolgreich gelöscht');
    } catch (requestError) {
      if (!redirectIfUnauthorized(requestError)) {
        setDeleteFeedback(formErrors(requestError, ['password']));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await api.logout();
      onNavigate('login');
    } catch (requestError) {
      showToast(errorMessage(requestError));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const normalizedEmail = email.trim().toLowerCase();
  const requiresPassword = normalizedEmail !== activeEmail.toLowerCase()
    && normalizedEmail !== pendingEmail?.toLowerCase();

  return (
    <AppShell>
      <AppHeader>
        <HeaderAction label="Zur Übersicht" text="Zurück" onClick={() => onNavigate('dashboard')}><ArrowLeft size={17} /></HeaderAction>
        <HeaderAction label="Abmelden" text="Abmelden" onClick={logout} disabled={isLoggingOut}><LogOut size={17} /></HeaderAction>
      </AppHeader>

      <PageContainer>
        <div className="mx-auto max-w-3xl">
          <PageHeading title="Profil" />

          <div className="space-y-4 sm:space-y-6">
            <Surface className={uiStyles.contentPadding}>
              <form onSubmit={submit} className={uiStyles.formStack}>
                <Field id="profile-name" name="name" label="Name" value={name} onChange={(event) => setName(event.target.value)} error={profileFeedback.fields.name} required />
                <Field id="profile-email" name="email" label="E-Mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail size={17} />} error={profileFeedback.fields.email} required />
                {pendingEmail && (
                  <div role="status" className="rounded-2xl border border-ocean-500/15 bg-ocean-100/70 p-3.5 sm:p-4">
                    <p className="text-sm font-medium leading-6 text-ink">Bis Sie die neue Adresse über den zugesandten Link bestätigen, bleibt die bisherige Adresse für die Anmeldung aktiv.</p>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-xl border border-ocean-500/10 bg-white/60 px-3 py-2.5">
                        <dt className="text-xs font-bold text-stone-500">Aktiv für die Anmeldung</dt>
                        <dd className="mt-0.5 break-all font-semibold text-ink">{activeEmail}</dd>
                      </div>
                      <div className="rounded-xl border border-ocean-500/10 bg-white/60 px-3 py-2.5">
                        <dt className="text-xs font-bold text-stone-500">Neue E-Mail</dt>
                        <dd className="mt-0.5 break-all font-semibold text-ink">{pendingEmail}</dd>
                      </div>
                    </dl>
                  </div>
                )}
                {requiresPassword && <Field id="profile-current-password" name="currentPassword" label="Aktuelles Passwort" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} icon={<KeyRound size={17} />} error={profileFeedback.fields.currentPassword} required />}
                <FormError message={profileFeedback.message} />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" disabled={isSaving || isResendingVerification}><Save size={17} /> {isSaving ? 'Speichert …' : 'Speichern'}</Button>
                  {pendingEmail && normalizedEmail === pendingEmail.toLowerCase() && (
                    <Button type="button" variant="secondary" onClick={resendEmailVerification} disabled={isResendingVerification || isSaving}>
                      <Mail size={17} /> {isResendingVerification ? 'Sendet …' : 'Link erneut senden'}
                    </Button>
                  )}
                </div>
              </form>
            </Surface>

            <Surface className={uiStyles.contentPadding}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-peach-200 text-plum-800"><KeyRound size={18} /></span>
                  <div><h2 className="font-black">Passwort</h2><p className="mt-1 text-sm text-stone-500">Sie erhalten einen einmaligen Link per E-Mail.</p></div>
                </div>
                <Button onClick={requestPasswordChange} disabled={isRequestingPasswordChange}>{isRequestingPasswordChange ? 'Sendet …' : 'Passwort ändern'}</Button>
              </div>
              <FormError message={passwordError} />
            </Surface>

            <Surface className={cn('flex flex-col gap-4 border-coral-300/70 bg-coral-100/50 sm:flex-row sm:items-center sm:justify-between', uiStyles.contentPadding)}>
              <div><h2 className="font-black text-plum-800">Konto löschen</h2><p className="mt-1 text-sm text-coral-600">Alle Daten werden entfernt.</p></div>
              <Button variant="danger" onClick={() => { setDeleteFeedback({ message: '', fields: {} }); setIsDeleteDialogOpen(true); }}><Trash2 size={17} /> Löschen</Button>
            </Surface>
          </div>
        </div>
      </PageContainer>
      <Footer />
      <AnimatePresence>
        {isDeleteDialogOpen && (
          <Modal title="Konto löschen?" onClose={() => { if (!isDeleting) setIsDeleteDialogOpen(false); }} size="sm">
            <form onSubmit={deleteAccount} className={uiStyles.formStack}>
              <p className="text-sm leading-6 text-stone-500">Ihr Profil und alle gespeicherten Geburtstage werden dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
              <Field id="delete-account-password" name="password" label="Passwort zur Bestätigung" type="password" autoComplete="current-password" error={deleteFeedback.fields.password} autoFocus required />
              <FormError message={deleteFeedback.message} />
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Abbrechen</Button>
                <Button type="submit" variant="danger" disabled={isDeleting}><Trash2 size={16} /> {isDeleting ? 'Löscht …' : 'Konto löschen'}</Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
