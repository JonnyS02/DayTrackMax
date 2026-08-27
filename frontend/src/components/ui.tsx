import { motion } from 'framer-motion';
import { CalendarDays, Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { gradientStyles, uiStyles } from '../design';
import { cn } from '../utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'large';
};

const buttonStyles = {
  primary: 'bg-coral-500 text-white shadow-lg shadow-coral-500/20 hover:-translate-y-0.5 hover:bg-coral-600',
  secondary: 'border border-sand-200 bg-sand-50 text-ink shadow-sm hover:border-coral-300 hover:bg-coral-100',
  danger: 'bg-plum-800 text-white shadow-lg shadow-plum-800/15 hover:-translate-y-0.5 hover:bg-plum-700',
};

const buttonSizeStyles = {
  default: 'h-10 px-3.5 sm:h-11 sm:px-4',
  large: 'h-11 px-4 sm:h-12 sm:px-5',
};

export function Button({ className, variant = 'primary', size = 'default', children, ...props }: ButtonProps) {
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition sm:rounded-2xl disabled:pointer-events-none disabled:opacity-50', buttonStyles[variant], buttonSizeStyles[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
  endAdornment?: ReactNode;
  error?: string;
};

export function Field({ label, icon, endAdornment, error, className, id, 'aria-describedby': describedBy, ...props }: FieldProps) {
  const errorId = id ? `${id}-error` : undefined;
  return (
    <label htmlFor={id} className="block">
      <span className={uiStyles.fieldLabel}>{label}</span>
      <span className="relative block">
        {icon && <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone-400">{icon}</span>}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={[describedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined}
          className={cn('h-11 w-full rounded-xl border border-sand-200 bg-sand-50 px-3.5 text-sm text-ink placeholder:text-stone-400 focus:bg-white sm:h-12 sm:rounded-2xl sm:px-4', uiStyles.focusRing, !!icon && 'pl-10 sm:pl-11', !!endAdornment && 'pr-11', error && 'border-coral-500', className)}
          {...props}
        />
        {endAdornment && <span className="absolute inset-y-0 right-3 flex items-center">{endAdornment}</span>}
      </span>
      {error && <span id={errorId} role="alert" className="mt-1.5 block text-sm font-bold text-coral-600">{error}</span>}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  return message ? <p role="alert" className="text-sm font-bold text-coral-600">{message}</p> : null;
}

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  wrapperClassName?: string;
};

export function SearchField({ wrapperClassName, className, ...props }: SearchFieldProps) {
  return (
    <label className={cn('relative block', wrapperClassName)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
      <input type="search" className={cn('h-10 w-full rounded-xl border border-sand-200 bg-white/70 pl-10 pr-3.5 text-sm text-ink placeholder:text-stone-400', uiStyles.focusRing, className)} {...props} />
    </label>
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('h-9 rounded-xl border border-sand-200 bg-sand-50 px-2.5 text-xs font-bold text-ink', uiStyles.focusRing, className)} {...props}>
      {children}
    </select>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-[15px] text-white shadow-lg shadow-coral-500/20', gradientStyles.brand)}>
        <CalendarDays size={21} strokeWidth={2.3} />
      </span>
      <span className="block text-lg font-black tracking-[-0.04em] text-ink">DayTrack Max</span>
    </div>
  );
}

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-sand-200/80 bg-sand-50/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:px-4 lg:h-[72px] lg:gap-3 lg:px-8">
        <Logo />
        <div className="ml-auto flex min-w-0 items-center gap-2">{children}</div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-sand-50 text-ink">{children}</div>;
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn('mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-4 sm:py-6 lg:px-8 lg:py-10', className)}>{children}</main>;
}

export function PageHeading({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3 sm:mb-6 sm:gap-4', className)}>
      <h1 className={uiStyles.pageTitle}>{title}</h1>
      {action}
    </div>
  );
}

type HeaderActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  text?: string;
  variant?: 'default' | 'accent';
};

export function HeaderAction({ label, text, variant = 'default', className, children, ...props }: HeaderActionProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-xl border px-2.5 text-sm font-bold transition',
        variant === 'accent'
          ? 'border-ocean-100 bg-ocean-100 text-ocean-500 hover:border-ocean-500/20 hover:bg-white'
          : 'border-sand-200 bg-white/60 text-stone-500 hover:border-coral-300 hover:bg-coral-100 hover:text-coral-600',
        className,
      )}
      {...props}
    >
      {children}
      {text && <span className="hidden lg:inline">{text}</span>}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: 'ghost' | 'warm' | 'danger' | 'outlined';
};

const iconButtonStyles = {
  ghost: 'text-stone-400 hover:bg-sand-100 hover:text-ink',
  warm: 'text-stone-400 hover:bg-peach-200 hover:text-plum-800',
  danger: 'text-stone-400 hover:bg-coral-100 hover:text-coral-600',
  outlined: 'border border-sand-200 bg-sand-50 text-stone-500 hover:border-coral-300 hover:text-coral-600',
};

export function IconButton({ label, title, variant = 'ghost', className, children, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={title ?? label}
      className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl transition disabled:pointer-events-none disabled:opacity-35', iconButtonStyles[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-3xl border border-sand-200 bg-white/75 shadow-sm sm:rounded-[2rem]', className)}>{children}</section>;
}

export function Footer() {
  return (
    <footer className="px-4 py-5 text-center text-xs font-normal leading-normal text-stone-400">
      © {new Date().getFullYear()} Jonathan Stengl
    </footer>
  );
}

export function Modal({ title, children, onClose, size = 'md' }: { title: string; children: ReactNode; onClose: () => void; size?: 'sm' | 'md' }) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.addEventListener('keydown', handleKeyDown);

    window.requestAnimationFrame(() => {
      if (!dialogRef.current?.contains(document.activeElement)) {
        const initialFocus = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
        if (initialFocus) initialFocus.focus();
        else dialogRef.current?.focus();
      }
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previousFocus?.focus();
    };
  }, []);

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-plum-800/30 p-2 backdrop-blur-sm sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.section
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn('max-h-[96vh] w-full overflow-y-auto rounded-3xl border border-sand-200 bg-sand-50 p-4 shadow-2xl sm:max-h-[92vh] sm:rounded-[2rem] sm:p-5 lg:p-7', size === 'sm' ? 'max-w-md' : 'max-w-xl')}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6 sm:gap-4">
          <h2 id="modal-title" className="text-xl font-black tracking-tight text-ink">{title}</h2>
          <IconButton onClick={onClose} label="Dialog schließen">
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </motion.section>
    </motion.div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <motion.div role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="fixed bottom-3 left-3 right-3 z-[70] rounded-xl bg-plum-800 px-4 py-3 text-sm font-bold text-white shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm sm:rounded-2xl sm:px-5 sm:py-4">
      {message}
    </motion.div>
  );
}
