"use client";

import { useMemo, type ReactNode } from "react";
import { CoffeeBean } from "./ui";

const COLORS = ["#C7A16A", "#E6D3B1", "#F7F0E6", "#A68A72", "#513126", "#D9B982"];

/** Full-screen premium reward celebration with gold confetti. */
export function Celebration({
  open,
  onClose,
  rewardName,
  customerName,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  rewardName: string;
  customerName?: string;
  actions?: ReactNode;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dx: (Math.random() - 0.5) * 240,
        w: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.6,
      })),
    // Regenerate each time the celebration opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-dark/85 p-6 fade-in" role="dialog" aria-modal="true" aria-label="Reward unlocked">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.w,
            background: p.color,
            animationDelay: `${p.delay}s`,
            ["--dx" as string]: `${p.dx}px`,
            borderRadius: p.round ? "9999px" : "2px",
          }}
        />
      ))}
      <div className="modal-in relative w-full max-w-md overflow-hidden rounded-[36px] border border-gold/40 bg-gradient-to-b from-[#3a221a] to-espresso p-8 text-center text-cream shadow-luxe">
        <div className="hairline absolute inset-x-0 top-0" />
        <div className="glow-ring mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full border border-gold/60 bg-espresso text-gold">
          <CoffeeBean className="h-10 w-10" />
        </div>
        <p className="eyebrow mb-3">Dolce Fedeltà</p>
        <h2 className="foil font-serif text-[44px] font-semibold leading-none tracking-tight">CONGRATULAZIONI!</h2>
        <p className="mx-auto mt-5 max-w-xs text-[15px] leading-relaxed text-ivory/90">
          {customerName ? `${customerName}, you` : "You"} have earned a complimentary Tiramisu Box.
        </p>
        <div className="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl border border-gold/40 bg-dark/40 px-6 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">Reward</span>
          <span className="mt-1 font-serif text-2xl text-gold-soft">{rewardName.toUpperCase()}</span>
        </div>
        <p className="mt-5 text-[13px] uppercase tracking-[0.22em] text-gold">Your reward is ready</p>
        <div className="mt-8 flex flex-col gap-3">
          {actions}
          <button onClick={onClose} className="btn-gold w-full">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
