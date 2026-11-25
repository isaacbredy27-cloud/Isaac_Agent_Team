import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

/* Small typed components over base.css. Import "./tokens.css" and "./base.css" once at the app entry. */

const cx = (...parts: Array<string | false | undefined | null>): string => parts.filter(Boolean).join(" ");

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
}

export function Button({ variant = "primary", block, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={cx("button", `button--${variant}`, block && "button--block", className)} {...rest} />;
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "article" | "section" | "li";
  interactive?: boolean;
}

export function Card({ as: Tag = "div", interactive, className, ...rest }: CardProps) {
  return <Tag className={cx("card", interactive && "card--interactive", className)} {...rest} />;
}

export type ScoreBand = "strong" | "moderate" | "weak";

const BAND_META: Record<ScoreBand, { icon: string; label: string }> = {
  strong: { icon: "●", label: "Strong match" },
  moderate: { icon: "◐", label: "Moderate match" },
  weak: { icon: "○", label: "Weak match" },
};

export interface ScoreBadgeProps {
  score: number;
  band: ScoreBand;
  className?: string;
}

/** Shows icon, number and text label. Screen readers hear "86, Strong match". */
export function ScoreBadge({ score, band, className }: ScoreBadgeProps) {
  const { icon, label } = BAND_META[band];
  return (
    <span className={cx("badge", `badge--${band}`, className)}>
      <span className="badge__icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        {Math.round(score)}
        <span className="visually-hidden">, </span> <span>{label}</span>
      </span>
    </span>
  );
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Toggle chip (filter). Selected state sets aria-pressed and adds a check mark. */
export function Chip({ selected, className, type = "button", ...rest }: ChipProps) {
  return <button type={type} aria-pressed={selected} className={cx("chip", className)} {...rest} />;
}

export interface GlassBarProps extends HTMLAttributes<HTMLElement> {
  position: "top" | "bottom";
  /** Use "nav" for a tab bar (give it aria-label), "header" for a top bar. */
  as?: "nav" | "header";
}

/** Fixed glass bar. Navigation layer only. */
export function GlassBar({ position, as: Tag = position === "bottom" ? "nav" : "header", className, ...rest }: GlassBarProps) {
  return <Tag className={cx("glass-bar", `glass-bar--${position}`, className)} {...rest} />;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  detent?: "medium" | "large";
  /** Label for the close control in the header. Default "Done". */
  closeLabel?: string;
  children: ReactNode;
}

/** Modal bottom sheet: role=dialog, Escape and backdrop close, minimal focus trap, focus restore. One at a time. */
export function Sheet({ open, title, onClose, detent = "medium", closeLabel = "Done", children }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    (node?.querySelector<HTMLElement>(FOCUSABLE) ?? node)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={cx("sheet", `sheet--${detent}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="sheet__grabber" aria-hidden="true" />
        <div className="sheet__header">
          <h2 id={titleId}>{title}</h2>
          <Button variant="ghost" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export interface SpinnerProps {
  /** Accessible status text. */
  label?: string;
}

export function Spinner({ label = "Loading" }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className="row">
      <span className="spinner" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon = "○", action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <h2>{title}</h2>
      {description ? <p className="text-secondary">{description}</p> : null}
      {action}
    </div>
  );
}
