import { motion } from 'framer-motion';
import { ArrowLeft, Check, Circle, Eye, EyeOff, KeyRound, LockKeyhole, Mail, MailCheck, ShieldAlert, UserRound, X } from 'lucide-react';
import { ChangeEventHandler, FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, errorMessage, formErrors } from '../api';
import { gradientStyles, uiStyles } from '../design';
import { screenRoutes } from '../routes';
import type { Screen } from '../types';
import { cn } from '../utils';
import { Button, Field, Footer, FormError, Logo } from './ui';

type AuthProps = {
  screen: Exclude<Screen, 'dashboard' | 'profile'>;
  onNavigate: (screen: Screen) => void;
  showToast: (message: string) => void;
};

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-sand-50 text-ink lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <section className={cn('relative hidden min-h-screen overflow-hidden p-12 text-white lg:flex lg:flex-col', gradientStyles.auth)}>
        <div className="relative [&_span]:text-white"><Logo /></div>
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-[125%] rounded-[50%] border border-white/20" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 h-52 w-[115%] rounded-[50%] border border-white/20" />
        <div className="pointer-events-none absolute bottom-14 right-16 h-20 w-20 rounded-full bg-peach-200/80 shadow-[0_0_80px_30px_rgba(255,214,162,0.35)]" />
      </section>
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 sm:px-6 lg:px-8">
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
  return (
    <AuthLayout>
      <AuthPanel centered>
        <AuthIcon tone="coral" large centered>{icon}</AuthIcon>
        <Title>{title}</Title>
        <div className="mb-7 text-sm leading-6 text-stone-500">{children}</div>
        <Button onClick={onPrimary} size="large" className="w-full" disabled={busy}>{primaryLabel}</Button>
        {onResend && <button onClick={onResend} disabled={busy} className={cn('mt-5 text-sm disabled:opacity-50', uiStyles.textLink)}>Erneut senden</button>}
      </AuthPanel>
    </AuthLayout>
  );
}

const passwordRequirements = [
  { label: 'Mindestens 10 Zeichen', isMet: (password: string) => password.length >= 10 },
  { label: 'Mindestens eine Zahl', isMet: (password: string) => /[0-9]/.test(password) },
  { label: 'Mindestens ein Sonderzeichen', isMet: (password: string) => /[^a-zA-Z0-9]/.test(password) },
] as const;

function PasswordRequirementList({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} aria-label="Passwortanforderungen" className="grid gap-1.5 rounded-xl bg-sand-100/70 px-3 py-2.5 text-xs sm:grid-cols-2">
      {passwordRequirements.map(({ label, isMet }) => {
        const met = isMet(password);
        const status = met ? 'Erfüllt' : password ? 'Nicht erfüllt' : 'Offen';
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

function PasswordField({ label = 'Passwort', id = 'password', autoComplete = 'current-password', error, value, onChange, showRequirements = false }: { label?: string; id?: string; autoComplete?: string; error?: string; value?: string; onChange?: ChangeEventHandler<HTMLInputElement>; showRequirements?: boolean }) {
  const [visible, setVisible] = useState(false);
  const requirementsId = `${id}-requirements`;
  return (
    <div className={showRequirements ? 'space-y-2' : undefined}>
      <Field
        id={id}
        name={id}
        label={label}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        icon={<LockKeyhole size={17} />}
        endAdornment={<button type="button" onClick={() => setVisible(!visible)} className="p-1 text-stone-400 transition hover:text-plum-800" aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
        error={error}
        value={value}
        onChange={onChange}
        aria-describedby={showRequirements ? requirementsId : undefined}
        required
      />
      {showRequirements && <PasswordRequirementList id={requirementsId} password={value ?? ''} />}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-stone-500 transition hover:text-coral-600 sm:mb-8"><ArrowLeft size={16} /> Zurück</button>;
}

function Login({ onNavigate }: Pick<AuthProps, 'onNavigate'>) {
  const route = useNavigate();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', fields: {} as Record<string, string> });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFeedback({ message: '', fields: {} });
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    try {
      await api.login(email, String(form.get('password') ?? ''));
      onNavigate('dashboard');
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
    <AuthLayout><AuthPanel><Title>Anmelden</Title><form onSubmit={submit} className={uiStyles.formStack}>
      <Field id="login-email" name="email" label="E-Mail" type="email" autoComplete="email" placeholder="max.mustermann@beispiel.de" icon={<Mail size={17} />} error={feedback.fields.email} required />
      <PasswordField error={feedback.fields.password} />
      <div className="text-right text-sm"><button type="button" onClick={() => onNavigate('forgot-password')} className={uiStyles.textLink}>Passwort vergessen?</button></div>
      <FormError message={feedback.message} />
      <Button type="submit" size="large" className="w-full" disabled={busy}>{busy ? 'Meldet an …' : 'Anmelden'}</Button>
    </form><p className="mt-7 text-center text-sm text-stone-500">Noch kein Konto? <button onClick={() => onNavigate('register')} className={cn('font-black', uiStyles.textLink)}>Registrieren</button></p></AuthPanel></AuthLayout>
  );
}

function Register({ onNavigate }: Pick<AuthProps, 'onNavigate'>) {
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
      await api.register(String(form.get('name') ?? ''), email, String(form.get('password') ?? ''), String(form.get('passwordConfirmation') ?? ''));
      route(`${screenRoutes['verify-email']}?email=${encodeURIComponent(email)}`);
    } catch (requestError) {
      setFeedback(formErrors(requestError, ['name', 'email', 'password', 'passwordConfirmation']));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout><AuthPanel><BackButton onClick={() => onNavigate('login')} /><Title>Registrieren</Title><form onSubmit={submit} className={uiStyles.formStack}>
      <Field id="register-name" name="name" label="Name" autoComplete="name" placeholder="Max Mustermann" icon={<UserRound size={17} />} error={feedback.fields.name} required />
      <Field id="register-email" name="email" label="E-Mail" type="email" autoComplete="email" placeholder="max.mustermann@beispiel.de" icon={<Mail size={17} />} error={feedback.fields.email} required />
      <PasswordField autoComplete="new-password" error={feedback.fields.password} value={password} onChange={(event) => setPassword(event.target.value)} showRequirements />
      <PasswordField label="Passwort wiederholen" id="passwordConfirmation" autoComplete="new-password" error={feedback.fields.passwordConfirmation} />
      <label className="flex items-start gap-3 text-sm leading-6 text-stone-500"><input type="checkbox" required className={cn('mt-1 shrink-0', uiStyles.checkbox)} /><span>Datenschutz akzeptieren</span></label>
      <FormError message={feedback.message} />
      <Button type="submit" size="large" className="w-full" disabled={busy}>{busy ? 'Erstellt …' : 'Konto erstellen'}</Button>
    </form></AuthPanel></AuthLayout>
  );
}

function VerifyEmail({ onNavigate, showToast }: Pick<AuthProps, 'onNavigate' | 'showToast'>) {
  const route = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email') ?? '';
  const processedToken = useRef<string | null>(null);
  const [state, setState] = useState<'ready' | 'checking' | 'success' | 'error'>(token ? 'checking' : 'ready');
  const [message, setMessage] = useState(token ? 'Der Link wird geprüft.' : email ? `Link gesendet an ${email}` : 'Öffnen Sie den Link aus Ihrer E-Mail.');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || processedToken.current === token) return;
    processedToken.current = token;
    setState('checking');
    setMessage('Der Link wird geprüft.');
    route(screenRoutes['verify-email'], { replace: true });
    api.confirmEmailVerification(token)
      .then(() => { setState('success'); setMessage('Ihre E-Mail-Adresse wurde bestätigt.'); })
      .catch((requestError) => { setState('error'); setMessage(errorMessage(requestError)); });
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
          setMessage('Ihre E-Mail-Adresse wurde bestätigt.');
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
      showToast('E-Mail erneut gesendet');
    } catch (requestError) {
      setMessage(errorMessage(requestError));
      setState('error');
    } finally {
      setBusy(false);
    }
  };

  const title = state === 'success' ? 'E-Mail bestätigt' : state === 'error' ? 'Link ungültig' : 'E-Mail bestätigen';
  return <AuthStatus icon={<MailCheck size={29} />} title={title} primaryLabel="Zur Anmeldung" onPrimary={() => onNavigate('login')} onResend={email !== '' && state !== 'checking' ? resend : undefined} busy={busy || state === 'checking'}>{message}</AuthStatus>;
}

function ForgotPassword({ onNavigate, showToast }: Pick<AuthProps, 'onNavigate' | 'showToast'>) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', fields: {} as Record<string, string> });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFeedback({ message: '', fields: {} });
    const email = String(new FormData(event.currentTarget).get('email') ?? '');
    try {
      await api.requestPasswordReset(email);
      showToast('Reset-Link gesendet');
      onNavigate('login');
    } catch (requestError) {
      setFeedback(formErrors(requestError, ['email']));
    } finally {
      setBusy(false);
    }
  };

  return <AuthLayout><AuthPanel><BackButton onClick={() => onNavigate('login')} /><AuthIcon tone="peach"><KeyRound size={24} /></AuthIcon><Title>Passwort zurücksetzen</Title><form onSubmit={submit} className={uiStyles.formStack}><Field id="forgot-email" name="email" label="E-Mail" type="email" autoComplete="email" placeholder="max.mustermann@beispiel.de" icon={<Mail size={17} />} error={feedback.fields.email} required /><FormError message={feedback.message} /><Button type="submit" size="large" className="w-full" disabled={busy}>{busy ? 'Sendet …' : 'Reset-Link senden'}</Button></form></AuthPanel></AuthLayout>;
}

function Locked({ onNavigate, showToast }: Pick<AuthProps, 'onNavigate' | 'showToast'>) {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [busy, setBusy] = useState(false);
  const resend = async () => {
    if (!email) return;
    setBusy(true);
    try {
      await api.requestPasswordReset(email);
      showToast('Reset-Link erneut gesendet');
    } catch (requestError) {
      showToast(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  return <AuthStatus icon={<ShieldAlert size={29} />} title="Konto gesperrt" primaryLabel="Zur Anmeldung" onPrimary={() => onNavigate('login')} onResend={email ? resend : undefined} busy={busy}>Reset-Link gesendet{email && <> an <span className="font-bold text-ink">{email}</span></>}</AuthStatus>;
}

function ResetPassword({ onNavigate, showToast }: Pick<AuthProps, 'onNavigate' | 'showToast'>) {
  const route = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenParameter = searchParams.get('token') ?? '';
  const [token] = useState(tokenParameter);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState({ message: token ? '' : 'Der Link ist ungültig oder unvollständig.', fields: {} as Record<string, string> });

  useEffect(() => {
    if (!tokenParameter) return;
    route(screenRoutes['reset-password'], { replace: true });
  }, [route, tokenParameter]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setFeedback({ message: '', fields: {} });
    const form = new FormData(event.currentTarget);
    try {
      await api.resetPassword(token, String(form.get('password') ?? ''), String(form.get('passwordConfirmation') ?? ''));
      showToast('Passwort geändert');
      onNavigate('login');
    } catch (requestError) {
      setFeedback(formErrors(requestError, ['password', 'passwordConfirmation']));
    } finally {
      setBusy(false);
    }
  };

  return <AuthLayout><AuthPanel><AuthIcon tone="ocean"><KeyRound size={24} /></AuthIcon><Title>Neues Passwort</Title><form onSubmit={submit} className={uiStyles.formStack}><PasswordField label="Neues Passwort" autoComplete="new-password" error={feedback.fields.password} value={password} onChange={(event) => setPassword(event.target.value)} showRequirements /><PasswordField label="Passwort wiederholen" id="passwordConfirmation" autoComplete="new-password" error={feedback.fields.passwordConfirmation} /><FormError message={feedback.message} /><Button type="submit" size="large" className="w-full" disabled={busy || !token}>{busy ? 'Speichert …' : 'Speichern'}</Button></form></AuthPanel></AuthLayout>;
}

export function AuthScreens({ screen, onNavigate, showToast }: AuthProps) {
  switch (screen) {
    case 'login': return <Login onNavigate={onNavigate} />;
    case 'register': return <Register onNavigate={onNavigate} />;
    case 'verify-email': return <VerifyEmail onNavigate={onNavigate} showToast={showToast} />;
    case 'forgot-password': return <ForgotPassword onNavigate={onNavigate} showToast={showToast} />;
    case 'locked': return <Locked onNavigate={onNavigate} showToast={showToast} />;
    case 'reset-password': return <ResetPassword onNavigate={onNavigate} showToast={showToast} />;
  }
}
