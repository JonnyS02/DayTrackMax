import { motion } from 'framer-motion';
import { ArrowLeft, Check, Circle, Eye, EyeOff, KeyRound, LockKeyhole, Mail, MailCheck, ShieldAlert, UserRound, X } from 'lucide-react';
import { ChangeEventHandler, FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, errorMessage, formErrors } from '../api';
import { demoAccount } from '../demo-account';
import { gradientStyles, uiStyles } from '../design';
import { screenRoutes } from '../routes';
import type { Screen } from '../types';
import { cn } from '../utils';
import { useApp } from './app-context';
import { Button, Field, Footer, FormError, LanguageSwitch, Logo } from './ui';

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-sand-50 text-ink lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <section className={cn('relative hidden min-h-screen overflow-hidden p-12 text-white lg:flex lg:flex-col', gradientStyles.auth)}>
        <div className="relative [&_span]:text-white"><Logo /></div>
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-[125%] rounded-[50%] border border-white/20" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 h-52 w-[115%] rounded-[50%] border border-white/20" />
        <div className="pointer-events-none absolute bottom-14 right-16 h-20 w-20 rounded-full bg-peach-200/80 shadow-[0_0_80px_30px_rgba(255,214,162,0.35)]" />
      </section>
      <section className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 sm:px-6 lg:px-8">
        <LanguageSwitch className="absolute right-4 top-4 sm:right-6 sm:top-6 lg:right-8 lg:top-8" />
        <div className="flex flex-1 flex-col justify-center py-6 sm:py-8 lg:py-10">
          <div className="mb-7 sm:mb-8 lg:hidden"><Logo /></div>
          {children}
        </div>
        <Footer />
      </section>
    </main>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h1 className={cn('mb-6 sm:mb-8', uiStyles.pageTitle)}>{children}</h1>;
}

function AuthPanel({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return <motion.div className={centered ? 'text-center' : undefined} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>{children}</motion.div>;
}

const authIconStyles = {
  coral: 'bg-coral-100 text-coral-600',
  peach: 'bg-peach-200 text-plum-800',
  ocean: 'bg-ocean-100 text-ocean-500',
} as const;

function AuthIcon({ children, tone, large = false, centered = false }: { children: ReactNode; tone: keyof typeof authIconStyles; large?: boolean; centered?: boolean }) {
  return <div className={cn('grid place-items-center rounded-2xl', large ? 'mb-5 h-14 w-14 sm:mb-7 sm:h-16 sm:w-16 sm:rounded-3xl' : 'mb-5 h-12 w-12 sm:mb-6 sm:h-14 sm:w-14', centered && 'mx-auto', authIconStyles[tone])}>{children}</div>;
}

function AuthStatus({ icon, title, children, primaryLabel, onPrimary, onResend, busy = false }: { icon: ReactNode; title: string; children: ReactNode; primaryLabel: string; onPrimary: () => void; onResend?: () => void; busy?: boolean }) {
  const { copy } = useApp();
  return (
    <AuthLayout>
      <AuthPanel centered>
        <AuthIcon tone="coral" large centered>{icon}</AuthIcon>
        <Title>{title}</Title>
        <div className="mb-7 text-sm leading-6 text-stone-500">{children}</div>
        <Button onClick={onPrimary} size="large" className="w-full" disabled={busy}>{primaryLabel}</Button>
        {onResend && <button onClick={onResend} disabled={busy} className={cn('mt-5 text-sm disabled:opacity-50', uiStyles.textLink)}>{copy.auth.resend}</button>}
      </AuthPanel>
    </AuthLayout>
  );
}

function PasswordRequirementList({ id, password }: { id: string; password: string }) {
  const { copy } = useApp();
  const passwordRequirements = [
    { label: copy.auth.password.minimumLength, isMet: (value: string) => value.length >= 10 },
    { label: copy.auth.password.number, isMet: (value: string) => /[0-9]/.test(value) },
    { label: copy.auth.password.specialCharacter, isMet: (value: string) => /[^a-zA-Z0-9]/.test(value) },
  ];
  return (
    <ul id={id} aria-label={copy.auth.password.requirements} className="grid gap-1.5 rounded-xl bg-sand-100/70 px-3 py-2.5 text-xs sm:grid-cols-2">
      {passwordRequirements.map(({ label, isMet }) => {
        const met = isMet(password);
        const status = met ? copy.auth.password.met : password ? copy.auth.password.unmet : copy.auth.password.open;
        const Icon = met ? Check : password ? X : Circle;

        return (
          <li key={label} className={cn('flex items-center gap-2', met ? 'text-ocean-500' : password ? 'text-coral-600' : 'text-stone-500')}>
            <Icon size={14} strokeWidth={2.4} aria-hidden="true" className="shrink-0" />
            <span><span className="sr-only">{status}: </span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function PasswordField({ label, id = 'password', autoComplete = 'current-password', error, value, onChange, readOnly = false, showRequirements = false }: { label?: string; id?: string; autoComplete?: string; error?: string; value?: string; onChange?: ChangeEventHandler<HTMLInputElement>; readOnly?: boolean; showRequirements?: boolean }) {
  const { copy } = useApp();
  const [visible, setVisible] = useState(false);
  const requirementsId = `${id}-requirements`;
  return (
    <div className={showRequirements ? 'space-y-2' : undefined}>
      <Field
        id={id}
        name={id}
        label={label ?? copy.common.password}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        icon={<LockKeyhole size={17} />}
        endAdornment={<button type="button" onClick={() => setVisible(!visible)} className="p-1 text-stone-400 transition hover:text-plum-800" aria-label={visible ? copy.auth.password.hide : copy.auth.password.show}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
        error={error}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        aria-describedby={showRequirements ? requirementsId : undefined}
        required
      />
      {showRequirements && <PasswordRequirementList id={requirementsId} password={value ?? ''} />}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  const { copy } = useApp();
  return <button onClick={onClick} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-stone-500 transition hover:text-coral-600 sm:mb-8"><ArrowLeft size={16} /> {copy.common.back}</button>;
}

function Login({ demo = false }: { demo?: boolean }) {
  const { copy, navigate } = useApp();
  const route = useNavigate();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', fields: {} as Record<string, string> });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFeedback({ message: '', fields: {} });
    const form = new FormData(event.currentTarget);
    const email = demo ? demoAccount.email : String(form.get('email') ?? '');
    const password = demo ? demoAccount.password : String(form.get('password') ?? '');
    try {
      await api.login(email, password);
      navigate('dashboard');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'ACCOUNT_LOCKED') {
        route(`${screenRoutes.locked}?email=${encodeURIComponent(email)}`);
      } else if (requestError instanceof ApiError && requestError.code === 'EMAIL_NOT_VERIFIED') {
        route(`${screenRoutes['verify-email']}?email=${encodeURIComponent(email)}`);
      } else {
        setFeedback(formErrors(requestError, ['email', 'password']));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <AuthPanel>
        <Title>{demo ? copy.auth.testLogin.title : copy.auth.login.title}</Title>
        <form onSubmit={submit} className={uiStyles.formStack}>
          <Field id="login-email" name="email" label={copy.common.email} type="email" autoComplete={demo ? 'off' : 'email'} placeholder="name@example.com" icon={<Mail size={17} />} error={feedback.fields.email} value={demo ? demoAccount.email : undefined} readOnly={demo} required />
          <PasswordField error={feedback.fields.password} autoComplete={demo ? 'off' : 'current-password'} value={demo ? demoAccount.password : undefined} readOnly={demo} />
          {!demo && <div className="text-right text-sm"><button type="button" onClick={() => navigate('forgot-password')} className={uiStyles.textLink}>{copy.auth.login.forgotPassword}</button></div>}
          <FormError message={feedback.message} />
          <Button type="submit" size="large" className="w-full" disabled={busy}>{busy ? copy.auth.login.submitting : copy.auth.login.submit}</Button>
        </form>
        <p className="mt-7 text-center text-sm text-stone-500">
          {demo
            ? <Link to={screenRoutes.login} className={cn('font-black', uiStyles.textLink)}>{copy.auth.testLogin.standardLogin}</Link>
            : <>{copy.auth.login.noAccount} <button onClick={() => navigate('register')} className={cn('font-black', uiStyles.textLink)}>{copy.auth.login.register}</button></>}
        </p>
        <a href="https://github.com/JonnyS02/DayTrackMax" target="_blank" rel="noopener noreferrer" aria-label={copy.auth.login.sourceCode} title={copy.auth.login.sourceCode} className={cn('mx-auto mt-5 grid h-10 w-10 place-items-center rounded-xl border border-sand-200 bg-white/40 text-stone-500 hover:bg-white hover:text-plum-800', uiStyles.focusRing)}>
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </AuthPanel>
    </AuthLayout>
  );
}

function Register() {
  const { copy, locale, navigate } = useApp();
  const route = useNavigate();
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState({ message: '', fields: {} as Record<string, string> });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFeedback({ message: '', fields: {} });
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    try {
      await api.register(String(form.get('name') ?? ''), email, String(form.get('password') ?? ''), String(form.get('passwordConfirmation') ?? ''), locale);
      route(`${screenRoutes['verify-email']}?email=${encodeURIComponent(email)}`);
    } catch (requestError) {
      setFeedback(formErrors(requestError, ['name', 'email', 'password', 'passwordConfirmation']));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout><AuthPanel><BackButton onClick={() => navigate('login')} /><Title>{copy.auth.register.title}</Title><form onSubmit={submit} className={uiStyles.formStack}>
      <Field id="register-name" name="name" label={copy.common.name} autoComplete="name" placeholder="Max Smith" icon={<UserRound size={17} />} error={feedback.fields.name} required />
      <Field id="register-email" name="email" label={copy.common.email} type="email" autoComplete="email" placeholder="name@example.com" icon={<Mail size={17} />} error={feedback.fields.email} required />
      <PasswordField autoComplete="new-password" error={feedback.fields.password} value={password} onChange={(event) => setPassword(event.target.value)} showRequirements />
      <PasswordField label={copy.auth.register.repeatPassword} id="passwordConfirmation" autoComplete="new-password" error={feedback.fields.passwordConfirmation} />
      <FormError message={feedback.message} />
      <Button type="submit" size="large" className="w-full" disabled={busy}>{busy ? copy.auth.register.submitting : copy.auth.register.submit}</Button>
    </form></AuthPanel></AuthLayout>
  );
}

function VerifyEmail() {
  const { copy, navigate, showToast } = useApp();
  const route = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email') ?? '';
  const processedToken = useRef<string | null>(null);
  const [state, setState] = useState<'ready' | 'checking' | 'success' | 'error'>(token ? 'checking' : 'ready');
  const [requestMessage, setRequestMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || processedToken.current === token) return;
    processedToken.current = token;
    setState('checking');
    setRequestMessage('');
    route(screenRoutes['verify-email'], { replace: true });
    api.confirmEmailVerification(token)
      .then(() => { setState('success'); setRequestMessage(''); })
      .catch((requestError) => { setState('error'); setRequestMessage(errorMessage(requestError)); });
  }, [route, token]);

  useEffect(() => {
    if (token || !email || state !== 'ready') return;

    let active = true;
    let timeoutId: number | undefined;

    const checkStatus = async () => {
      try {
        const { verified } = await api.getEmailVerificationStatus();
        if (!active) return;

        if (verified) {
          setState('success');
          setRequestMessage('');
          return;
        }
      } catch {
        // A temporary polling failure must not replace the verification screen.
      }

      if (active) timeoutId = window.setTimeout(checkStatus, 3000);
    };

    void checkStatus();

    return () => {
      active = false;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [email, state, token]);

  const resend = async () => {
    if (!email) return;
    setBusy(true);
    try {
      await api.requestEmailVerification(email);
      showToast(copy.auth.verify.resent);
    } catch (requestError) {
      setRequestMessage(errorMessage(requestError));
      setState('error');
    } finally {
      setBusy(false);
    }
  };

  const title = state === 'success' ? copy.auth.verify.confirmedTitle : state === 'error' ? copy.auth.verify.invalidTitle : copy.auth.verify.title;
  const message = requestMessage || (state === 'checking'
    ? copy.auth.verify.checking
    : state === 'success'
      ? copy.auth.verify.confirmedMessage
      : email ? copy.auth.verify.sentTo(email) : copy.auth.verify.openEmail);
  return <AuthStatus icon={<MailCheck size={29} />} title={title} primaryLabel={copy.auth.verify.toLogin} onPrimary={() => navigate('login')} onResend={email !== '' && state !== 'checking' ? resend : undefined} busy={busy || state === 'checking'}>{message}</AuthStatus>;
}

function ForgotPassword() {
  const { copy, navigate, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', fields: {} as Record<string, string> });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFeedback({ message: '', fields: {} });
    const email = String(new FormData(event.currentTarget).get('email') ?? '');
    try {
      await api.requestPasswordReset(email);
      showToast(copy.auth.forgot.sent);
      navigate('login');
    } catch (requestError) {
      setFeedback(formErrors(requestError, ['email']));
    } finally {
      setBusy(false);
    }
  };

  return <AuthLayout><AuthPanel><BackButton onClick={() => navigate('login')} /><AuthIcon tone="peach"><KeyRound size={24} /></AuthIcon><Title>{copy.auth.forgot.title}</Title><form onSubmit={submit} className={uiStyles.formStack}><Field id="forgot-email" name="email" label={copy.common.email} type="email" autoComplete="email" placeholder="name@example.com" icon={<Mail size={17} />} error={feedback.fields.email} required /><FormError message={feedback.message} /><Button type="submit" size="large" className="w-full" disabled={busy}>{busy ? copy.common.sending : copy.auth.forgot.submit}</Button></form></AuthPanel></AuthLayout>;
}

function Locked() {
  const { copy, navigate, showToast } = useApp();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [busy, setBusy] = useState(false);
  const resend = async () => {
    if (!email) return;
    setBusy(true);
    try {
      await api.requestPasswordReset(email);
      showToast(copy.auth.locked.resent);
    } catch (requestError) {
      showToast(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  return <AuthStatus icon={<ShieldAlert size={29} />} title={copy.auth.locked.title} primaryLabel={copy.auth.verify.toLogin} onPrimary={() => navigate('login')} onResend={email ? resend : undefined} busy={busy}>{email ? copy.auth.locked.sentTo(email) : copy.auth.locked.sent}</AuthStatus>;
}

function ResetPassword() {
  const { copy, navigate, showToast } = useApp();
  const route = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenParameter = searchParams.get('token') ?? '';
  const [token] = useState(tokenParameter);
  const validationStarted = useRef(false);
  const [state, setState] = useState<'checking' | 'ready' | 'error'>(token ? 'checking' : 'error');
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [linkError, setLinkError] = useState<'missing' | 'expired' | null>(token ? null : 'missing');
  const [feedback, setFeedback] = useState({ message: '', fields: {} as Record<string, string> });

  useEffect(() => {
    if (!token || validationStarted.current) return;
    validationStarted.current = true;
    route(screenRoutes['reset-password'], { replace: true });
    api.validatePasswordResetToken(token)
      .then(() => setState('ready'))
      .catch(() => {
        setLinkError('expired');
        setState('error');
      });
  }, [route, token]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setFeedback({ message: '', fields: {} });
    const form = new FormData(event.currentTarget);
    try {
      await api.resetPassword(token, String(form.get('password') ?? ''), String(form.get('passwordConfirmation') ?? ''));
      showToast(copy.auth.reset.passwordChanged);
      navigate('login');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'INVALID_TOKEN') {
        setLinkError(null);
        setFeedback({ message: requestError.message, fields: {} });
        setState('error');
      } else {
        setFeedback(formErrors(requestError, ['password', 'passwordConfirmation']));
      }
    } finally {
      setBusy(false);
    }
  };

  if (state === 'checking') {
    return <AuthLayout><AuthPanel centered><AuthIcon tone="ocean" large centered><KeyRound size={29} /></AuthIcon><Title>{copy.auth.reset.checkingTitle}</Title></AuthPanel></AuthLayout>;
  }

  if (state === 'error') {
    const message = linkError === 'missing' ? copy.auth.reset.missingLink : linkError === 'expired' ? copy.auth.reset.expiredLink : feedback.message;
    return <AuthStatus icon={<ShieldAlert size={29} />} title={copy.auth.reset.invalidTitle} primaryLabel={copy.auth.reset.requestNewLink} onPrimary={() => navigate('forgot-password')}>{message}</AuthStatus>;
  }

  return <AuthLayout><AuthPanel><AuthIcon tone="ocean"><KeyRound size={24} /></AuthIcon><Title>{copy.auth.reset.title}</Title><form onSubmit={submit} className={uiStyles.formStack}><PasswordField label={copy.auth.reset.newPassword} autoComplete="new-password" error={feedback.fields.password} value={password} onChange={(event) => setPassword(event.target.value)} showRequirements /><PasswordField label={copy.auth.reset.repeatPassword} id="passwordConfirmation" autoComplete="new-password" error={feedback.fields.passwordConfirmation} /><FormError message={feedback.message} /><Button type="submit" size="large" className="w-full" disabled={busy || !token}>{busy ? copy.common.saving : copy.common.save}</Button></form></AuthPanel></AuthLayout>;
}

export function AuthScreens({ screen }: { screen: Exclude<Screen, 'dashboard' | 'profile'> }) {
  const { clearUserLocale } = useApp();
  useEffect(clearUserLocale, [clearUserLocale]);

  switch (screen) {
    case 'login': return <Login key="login" />;
    case 'test-login': return <Login key="test-login" demo />;
    case 'register': return <Register />;
    case 'verify-email': return <VerifyEmail />;
    case 'forgot-password': return <ForgotPassword />;
    case 'locked': return <Locked />;
    case 'reset-password': return <ResetPassword />;
  }
}
