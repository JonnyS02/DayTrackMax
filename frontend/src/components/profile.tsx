import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, KeyRound, LogOut, Mail, Save, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError, errorMessage, formErrors } from '../api';
import { uiStyles } from '../design';
import type { User } from '../types';
import { cn } from '../utils';
import { useApp } from './app-context';
import { AppHeader, AppShell, Button, Field, Footer, FormError, HeaderAction, LanguageSwitch, Modal, PageContainer, PageHeading, Surface } from './ui';

export function Profile() {
  const { clearUserLocale, copy, navigate, showToast, syncUserLocale } = useApp();
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
  const [isCancellingEmailChange, setIsCancellingEmailChange] = useState(false);
  const [isRequestingPasswordChange, setIsRequestingPasswordChange] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const applyUser = useCallback((user: User) => {
    setName(user.name);
    setEmail(user.pendingEmail ?? user.email);
    setActiveEmail(user.email);
    setPendingEmail(user.pendingEmail);
    syncUserLocale(user.locale);
  }, [syncUserLocale]);

  const redirectIfUnauthorized = useCallback((requestError: unknown) => {
    if (requestError instanceof ApiError && requestError.status === 401) {
      if (requestError.code === 'REAUTHENTICATION_REQUIRED') showToast(requestError.message);
      navigate('login');
      return true;
    }

    return false;
  }, [navigate, showToast]);

  useEffect(() => {
    let active = true;
    api.getProfile()
      .then((user) => { if (active) applyUser(user); })
      .catch((requestError) => {
        if (!active) return;
        if (!redirectIfUnauthorized(requestError)) {
          setProfileFeedback({ message: errorMessage(requestError), fields: {} });
        }
      });
    return () => { active = false; };
  }, [applyUser, redirectIfUnauthorized]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const emailChangeRequested = requiresPassword;
    setProfileFeedback({ message: '', fields: {} });
    setIsSaving(true);
    try {
      const user = await api.updateProfile(name, email, currentPassword);
      applyUser(user);
      setCurrentPassword('');
      showToast(emailChangeRequested ? copy.profile.confirmationSent : copy.profile.saved);
    } catch (requestError) {
      if (!redirectIfUnauthorized(requestError)) {
        setProfileFeedback(formErrors(requestError, ['name', 'email', 'currentPassword']));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEmailChange = async () => {
    setProfileFeedback({ message: '', fields: {} });
    setIsCancellingEmailChange(true);
    try {
      applyUser(await api.cancelEmailChange());
      setCurrentPassword('');
      showToast(copy.profile.emailChangeCancelled);
    } catch (requestError) {
      if (!redirectIfUnauthorized(requestError)) {
        setProfileFeedback({ message: errorMessage(requestError), fields: {} });
      }
    } finally {
      setIsCancellingEmailChange(false);
    }
  };

  const resendEmailVerification = async () => {
    if (!pendingEmail) return;

    setProfileFeedback({ message: '', fields: {} });
    setIsResendingVerification(true);
    try {
      await api.requestEmailVerification(pendingEmail);
      showToast(copy.profile.confirmationResent);
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
      showToast(copy.profile.verificationSent);
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
      clearUserLocale();
      setIsDeleteDialogOpen(false);
      navigate('login');
      showToast(copy.profile.accountDeleted);
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
      clearUserLocale();
      navigate('login');
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
        <LanguageSwitch disabled={activeEmail === ''} />
        <HeaderAction label={copy.profile.overview} text={copy.common.back} onClick={() => navigate('dashboard')}><ArrowLeft size={17} /></HeaderAction>
        <HeaderAction label={copy.common.logout} text={copy.common.logout} onClick={logout} disabled={isLoggingOut}><LogOut size={17} /></HeaderAction>
      </AppHeader>

      <PageContainer>
        <div className="mx-auto max-w-3xl">
          <PageHeading title={copy.profile.title} />

          <div className="space-y-4 sm:space-y-6">
            <Surface className={uiStyles.contentPadding}>
              <form onSubmit={submit} className={uiStyles.formStack}>
                <Field id="profile-name" name="name" label={copy.common.name} value={name} onChange={(event) => setName(event.target.value)} error={profileFeedback.fields.name} required />
                <Field id="profile-email" name="email" label={copy.common.email} type="email" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail size={17} />} error={profileFeedback.fields.email} required />
                {pendingEmail && (
                  <div role="status" className="rounded-2xl border border-ocean-500/15 bg-ocean-100/70 p-3.5 sm:p-4">
                    <p className="text-sm font-medium leading-6 text-ink">{copy.profile.pendingExplanation}</p>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-xl border border-ocean-500/10 bg-white/60 px-3 py-2.5">
                        <dt className="text-xs font-bold text-stone-500">{copy.profile.activeLoginEmail}</dt>
                        <dd className="mt-0.5 break-all font-semibold text-ink">{activeEmail}</dd>
                      </div>
                      <div className="rounded-xl border border-ocean-500/10 bg-white/60 px-3 py-2.5">
                        <dt className="text-xs font-bold text-stone-500">{copy.profile.newEmail}</dt>
                        <dd className="mt-0.5 break-all font-semibold text-ink">{pendingEmail}</dd>
                      </div>
                    </dl>
                    <Button type="button" variant="secondary" className="mt-3 w-full sm:w-auto" onClick={cancelEmailChange} disabled={isCancellingEmailChange || isSaving || isResendingVerification}>
                      <X size={16} /> {isCancellingEmailChange ? copy.profile.cancelling : copy.profile.cancelChange}
                    </Button>
                  </div>
                )}
                {requiresPassword && <Field id="profile-current-password" name="currentPassword" label={copy.profile.currentPassword} type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} icon={<KeyRound size={17} />} error={profileFeedback.fields.currentPassword} required />}
                <FormError message={profileFeedback.message} />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" disabled={isSaving || isResendingVerification || isCancellingEmailChange}><Save size={17} /> {isSaving ? copy.common.saving : copy.common.save}</Button>
                  {pendingEmail && normalizedEmail === pendingEmail.toLowerCase() && (
                    <Button type="button" variant="secondary" onClick={resendEmailVerification} disabled={isResendingVerification || isSaving || isCancellingEmailChange}>
                      <Mail size={17} /> {isResendingVerification ? copy.common.sending : copy.profile.resendLink}
                    </Button>
                  )}
                </div>
              </form>
            </Surface>

            <Surface className={uiStyles.contentPadding}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-peach-200 text-plum-800"><KeyRound size={18} /></span>
                  <div><h2 className="font-black">{copy.common.password}</h2><p className="mt-1 text-sm text-stone-500">{copy.profile.passwordDescription}</p></div>
                </div>
                <Button onClick={requestPasswordChange} disabled={isRequestingPasswordChange}>{isRequestingPasswordChange ? copy.common.sending : copy.profile.changePassword}</Button>
              </div>
              <FormError message={passwordError} />
            </Surface>

            <Surface className={cn('flex flex-col gap-4 border-coral-300/70 bg-coral-100/50 sm:flex-row sm:items-center sm:justify-between', uiStyles.contentPadding)}>
              <h2 className="font-black text-coral-600">{copy.profile.deleteAccount}</h2>
              <Button variant="danger" onClick={() => { setDeleteFeedback({ message: '', fields: {} }); setIsDeleteDialogOpen(true); }}><Trash2 size={17} /> {copy.common.delete}</Button>
            </Surface>
          </div>
        </div>
      </PageContainer>
      <Footer />
      <AnimatePresence>
        {isDeleteDialogOpen && (
          <Modal title={copy.profile.deleteTitle} onClose={() => { if (!isDeleting) setIsDeleteDialogOpen(false); }} size="sm">
            <form onSubmit={deleteAccount} className={uiStyles.formStack}>
              <p className="text-sm font-medium leading-6 text-ink">{copy.profile.deleteDescription}</p>
              <Field id="delete-account-password" name="password" label={copy.profile.confirmationPassword} type="password" autoComplete="current-password" error={deleteFeedback.fields.password} autoFocus required />
              <FormError message={deleteFeedback.message} />
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>{copy.common.cancel}</Button>
                <Button type="submit" variant="danger" disabled={isDeleting}><Trash2 size={16} /> {isDeleting ? copy.common.deleting : copy.profile.deleteAccount}</Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
