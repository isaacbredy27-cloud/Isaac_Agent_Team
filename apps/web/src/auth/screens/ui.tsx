// Shared auth UI pieces. Classes come from apps/web/src/design (Sable): .card .button .button--primary .field.
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { authCopy } from "../copy";
import type { AuthErrorKind } from "../helpers";

export function AuthPage({ title, children }: { title: string; children: ReactNode }) {
  const h = useRef<HTMLHeadingElement>(null);
  useEffect(() => h.current?.focus(), []);
  return (
    <div className="auth-page">
      <section className="card auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title" ref={h} tabIndex={-1}>
          {title}
        </h1>
        {children}
      </section>
    </div>
  );
}

export function ErrorMessage({ kind }: { kind: AuthErrorKind | null }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (kind) ref.current?.focus();
  }, [kind]);
  if (!kind) return null;
  const text = kind === "notConfigured" ? authCopy.notConfigured : authCopy.error[kind];
  return (
    <p className="auth-error" role="alert" ref={ref} tabIndex={-1}>
      {text}
    </p>
  );
}

export function Status({ children }: { children: ReactNode }) {
  return (
    <p className="auth-status" role="status">
      {children}
    </p>
  );
}

export function EmailField({ value, onChange, readOnly, login }: { value: string; onChange(v: string): void; readOnly?: boolean; login?: boolean }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{authCopy.emailLabel}</label>
      <input
        id={id}
        type="email"
        name="email"
        required
        inputMode="email"
        autoComplete={login ? "username" : "email"}
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function PasswordField({
  value,
  onChange,
  readOnly,
  isNew,
  label = authCopy.passwordLabel,
}: {
  value: string;
  onChange(v: string): void;
  readOnly?: boolean;
  isNew?: boolean;
  label?: string;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-row">
        <input
          id={id}
          type={shown ? "text" : "password"}
          name="password"
          required
          autoComplete={isNew ? "new-password" : "current-password"}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" className="button" aria-pressed={shown} aria-controls={id} onClick={() => setShown((s) => !s)}>
          {shown ? authCopy.hidePassword : authCopy.showPassword}
        </button>
      </div>
    </div>
  );
}

export function CodeField({ value, onChange, readOnly }: { value: string; onChange(v: string): void; readOnly?: boolean }) {
  const id = useId();
  const hint = `${id}-hint`;
  return (
    <div className="field">
      <label htmlFor={id}>{authCopy.code.label}</label>
      <p id={hint} className="field-hint">
        {authCopy.code.hint}
      </p>
      <input
        id={id}
        name="code"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        aria-describedby={hint}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      />
    </div>
  );
}

/** Primary submit. Keeps focus and width while busy (aria-disabled, not disabled). */
export function SubmitButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <button type="submit" className="button button--primary" aria-disabled={busy || undefined}>
      {busy ? busyLabel : label}
    </button>
  );
}

/** Wraps onSubmit so a busy form ignores repeat submits. */
export function guard(busy: boolean, fn: () => void | Promise<void>) {
  return (e: FormEvent) => {
    e.preventDefault();
    if (!busy) void fn();
  };
}

/** Google branding: label "Continue with Google", standard colour G, unmodified. */
export function GoogleButton({ onClick, disabled }: { onClick(): void; disabled?: boolean }) {
  return (
    <button type="button" className="button button-google" onClick={() => {
        if (!disabled) onClick();
      }}
      aria-disabled={disabled || undefined}
    >
      <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      <span>{authCopy.google}</span>
    </button>
  );
}

export function Divider() {
  return (
    <p className="auth-divider" aria-hidden="true">
      {authCopy.orDivider}
    </p>
  );
}
