"use client";

import { formatCardNumber, formatDate } from "@/lib/format";
import { type Customer, type RewardState } from "@/lib/db";
import { CoffeeBean, Logo, StatusBadge } from "./ui";
import { QRCodeImage } from "./QRCodeImage";

interface StampCardProps {
  customer: Customer;
  stampRequirement: number;
  rewardName: string;
  rewardState: RewardState;
  qrValue?: string;
  highlightLatest?: boolean;
  compact?: boolean;
  showQR?: boolean;
}

/** The Casa Tiramisù digital membership & stamp card. Designed to be screenshot-worthy. */
export function StampCard({
  customer,
  stampRequirement,
  rewardName,
  rewardState,
  qrValue,
  highlightLatest: highlightProp,
  compact = false,
  showQR = true,
}: StampCardProps) {
  const req = stampRequirement;
  // A stamp awarded in the last few seconds gets the premium "press" animation automatically.
  const justStamped = !!customer.lastStampAt && Date.now() - new Date(customer.lastStampAt).getTime() < 5000;
  const highlightLatest = highlightProp ?? justStamped;
  const count = Math.min(customer.currentStamps, req);
  const remaining = Math.max(0, req - count);
  const pct = Math.round((count / req) * 100);
  const cols = req <= 8 ? "grid-cols-4" : "grid-cols-5";
  const unlocked = rewardState === "UNLOCKED";

  const message = unlocked
    ? "Congratulazioni — your reward is ready. Show this card at the counter to redeem."
    : rewardState === "REDEEMED" && count === 0
      ? "Reward redeemed. A fresh cycle has begun — the next stamp starts your journey again."
      : remaining === 1
        ? "Just 1 more stamp to unlock your complimentary Tiramisu Box."
        : `Collect ${remaining} more stamps to unlock your complimentary Tiramisu Box.`;

  return (
    <article
      className={`member-card panel-dark relative w-full rounded-[32px] text-cream shadow-luxe ring-1 ring-gold/25 ${
        compact ? "p-5" : "p-6 sm:p-8"
      }`}
      aria-label={`Casa Tiramisù loyalty card for ${customer.name}`}
    >
      {/* inner gold keyline */}
      <div className="pointer-events-none absolute inset-[10px] rounded-[24px] border border-gold/20" />

      <div className="relative">
        <header className="flex items-start justify-between gap-4">
          <Logo tone="light" size="sm" href="/" />
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">Loyalty Card</p>
            <p className="mt-1.5 font-serif text-[15px] italic text-ivory/80">Cycle {String(customer.cycle).padStart(2, "0")}</p>
          </div>
        </header>

        <div className="mt-7 flex flex-col gap-1">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Member</p>
          <h3 className="font-serif text-[30px] leading-tight text-cream sm:text-[34px]">{customer.name}</h3>
          <p className="text-[12px] text-ivory/60">Member since {formatDate(customer.registeredAt)}</p>
        </div>

        {/* Stamp grid */}
        <div className={`mt-7 grid ${cols} gap-x-3 gap-y-4 sm:gap-x-4`} role="list" aria-label={`${count} of ${req} stamps collected`}>
          {Array.from({ length: req }, (_, i) => {
            const filled = i < count;
            const isLatest = filled && i === count - 1 && highlightLatest;
            const isNext = !filled && i === count && !unlocked;
            return (
              <div
                key={i}
                role="listitem"
                className={`stamp-slot ${filled ? "is-filled" : ""} ${isLatest ? "is-new" : ""} ${isNext ? "is-next" : ""} mx-auto w-full max-w-[72px]`}
                aria-label={filled ? `Stamp ${i + 1} collected` : `Stamp ${i + 1} empty`}
              >
                {filled ? (
                  <CoffeeBean className="stamp-icon" />
                ) : (
                  <span className="stamp-number">{String(i + 1).padStart(2, "0")}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <p className="font-serif text-[15px] text-ivory/80">Your progress</p>
            <p className="font-serif text-[28px] leading-none">
              <span className="foil font-semibold">{count}</span>
              <span className="text-ivory/50"> / {req}</span>
              <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-[0.22em] text-gold/80">Stamps</span>
            </p>
          </div>
          <div className="mt-3 h-[6px] w-full overflow-hidden rounded-full bg-dark/60 ring-1 ring-inset ring-gold/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8a6238] via-[#c7a16a] to-[#f1e2c3] transition-[width] duration-[1200ms] ease-out"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={req}
              aria-valuenow={count}
            />
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-ivory/85">{message}</p>
        </div>

        <div className="hairline mt-7 opacity-60" />

        {/* Footer: reward + QR */}
        <div className={`mt-6 flex ${showQR && !compact ? "flex-col-reverse gap-6 sm:flex-row sm:items-end sm:justify-between" : "items-center justify-between gap-4"}`}>
          <div className="min-w-0 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">Reward</p>
              <p className="mt-1.5 font-serif text-[20px] leading-tight text-cream">{rewardName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge state={rewardState} />
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted">ID {customer.id}</span>
            </div>
            <p className="font-mono text-[12px] tracking-[0.18em] text-ivory/60">{formatCardNumber(customer.cardNumber)}</p>
          </div>

          {showQR && qrValue && (
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="rounded-[20px] bg-cream p-2.5 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)]">
                <QRCodeImage value={qrValue} size={compact ? 96 : 118} alt={`QR code for ${customer.id}`} className="block" />
              </div>
              <p className="text-[9px] uppercase tracking-[0.26em] text-muted">Scan at counter</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
