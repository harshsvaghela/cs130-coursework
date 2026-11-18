"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";

/* ---------- Brand wordmark ---------- */
export function Logo({
  tone = "light",
  size = "md",
  href = "/",
}: {
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  href?: string;
}) {
  const main = tone === "light" ? "text-cream" : "text-espresso";
  const sizes = {
    sm: { casa: "text-[8px]", name: "text-[17px]", sub: "text-[7px]" },
    md: { casa: "text-[9px]", name: "text-[22px]", sub: "text-[8px]" },
    lg: { casa: "text-[11px]", name: "text-[40px] md:text-[52px]", sub: "text-[10px]" },
  }[size];
  return (
    <Link href={href} className="group inline-flex flex-col items-start leading-none" aria-label="Casa Tiramisù home">
      <span className={`${sizes.casa} font-semibold uppercase tracking-[0.46em] text-gold`}>Casa</span>
      <span
        className={`${sizes.name} ${main} mt-1 font-serif font-semibold tracking-[0.02em] transition-colors group-hover:text-gold`}
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Tiramisù
      </span>
      <span className={`${sizes.sub} mt-1.5 font-semibold uppercase tracking-[0.34em] text-muted`}>Dolce Fedeltà</span>
    </Link>
  );
}

/* ---------- Coffee bean stamp icon ---------- */
export function CoffeeBean({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <ellipse cx="12" cy="12" rx="7.6" ry="10" transform="rotate(-22 12 12)" fill="currentColor" />
      <path
        d="M9.2 4.6c3.1 3.4 2.6 6.8 4.1 9.2 1.2 2 2.3 3.2 3.5 4.6"
        fill="none"
        stroke="#1B100D"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/* ---------- Reward state badge ---------- */
export function StatusBadge({ state }: { state: "LOCKED" | "UNLOCKED" | "REDEEMED" }) {
  if (state === "UNLOCKED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-espresso shadow-[0_6px_16px_-6px_rgba(199,161,106,0.9)]">
        <span className="h-1.5 w-1.5 rounded-full bg-espresso animate-pulse" /> Unlocked
      </span>
    );
  }
  if (state === "REDEEMED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
        ✓ Redeemed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-muted/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
      Locked
    </span>
  );
}

/* ---------- Modal (bottom sheet on mobile, dialog on desktop) ---------- */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = "max-w-lg",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  dismissible?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6 fade-in" role="presentation">
      <div
        className="absolute inset-0 bg-dark/70 backdrop-blur-[2px]"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal-in relative w-full ${width} max-h-[92vh] overflow-y-auto rounded-t-[32px] border border-gold/20 bg-cream shadow-luxe sm:rounded-[32px]`}
      >
        <div className="hairline absolute inset-x-0 top-0 opacity-80" />
        <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-9">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-espresso/15 sm:hidden" />
          {(eyebrow || title) && (
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
                {title && <h2 className="display text-[28px] leading-tight text-espresso">{title}</h2>}
              </div>
              {dismissible && (
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-espresso/15 text-espresso transition hover:border-gold hover:text-gold"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          )}
          {children}
          {footer && <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Form field wrapper ---------- */
export function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-red-800">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------- Page heading for admin & inner pages ---------- */
export function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="display text-[34px] leading-[1.05] text-espresso md:text-[44px]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-choc/75">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-[28px] border border-dashed border-espresso/20 bg-white/50 px-6 py-14 text-center">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full border border-gold/50 text-gold">
        <CoffeeBean className="h-6 w-6" />
      </div>
      <h3 className="display text-2xl text-espresso">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted">{text}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function InternalLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`underline-offset-4 transition hover:text-gold hover:underline ${className}`}>
      {children}
    </Link>
  );
}
