"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { customerRewards, findCustomerById, pendingRewardFor, rewardStateFor, useDb } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cardUrl, getActiveCustomerId } from "@/lib/session";
import { Celebration } from "@/components/Celebration";
import { QRCodeImage } from "@/components/QRCodeImage";
import { EmptyState, Spinner, StatusBadge } from "@/components/ui";

const SEEN_KEY = "casa-tiramisu-seen-rewards";

function readSeen(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(SEEN_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export default function RewardPage() {
  const data = useDb();
  const [ready, setReady] = useState(false);
  const [cid, setCid] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    setCid(new URLSearchParams(window.location.search).get("cid"));
    setActiveId(getActiveCustomerId());
    setReady(true);
    const sync = () => setActiveId(getActiveCustomerId());
    window.addEventListener("casa-active-customer", sync);
    return () => window.removeEventListener("casa-active-customer", sync);
  }, []);

  const customer = ready ? findCustomerById(data, cid || activeId || "NONE") : undefined;
  const pending = customer ? pendingRewardFor(data, customer.id) : undefined;

  // Automatic celebration the first time a reward is seen as unlocked.
  useEffect(() => {
    if (!pending) return;
    if (!readSeen().includes(pending.id)) setCelebrate(true);
  }, [pending?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <EmptyState
          title="Reward status appears here"
          text="Join the club and collect stamps. Once your card is complete, your complimentary Tiramisu Box will appear on this page."
          action={
            <Link href="/register" className="btn-gold">
              Join Our Loyalty Club
            </Link>
          }
        />
      </div>
    );
  }

  const state = rewardStateFor(data, customer);
  const rewards = customerRewards(data, customer.id);
  const req = data.settings.stampRequirement;

  const dismiss = () => {
    if (pending) {
      const seen = readSeen();
      window.localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...seen, pending.id])]));
    }
    setCelebrate(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-16">
      <header className="reveal mb-10 md:mb-14">
        <p className="eyebrow mb-4">Rewards</p>
        <h1 className="display text-[40px] leading-[1.02] text-espresso md:text-[60px]">
          Your complimentary <span className="italic text-choc">Tiramisù.</span>
        </h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="reveal reveal-delay-1 panel-dark relative overflow-hidden rounded-[36px] p-7 text-cream shadow-luxe ring-1 ring-gold/25 sm:p-12 lg:col-span-7">
          <div className="pointer-events-none absolute inset-[12px] rounded-[26px] border border-gold/20" />
          <div className="relative">
            <div className="mb-8 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.28em] text-gold">{customer.name}</p>
              <StatusBadge state={state} />
            </div>

            {state === "UNLOCKED" && (
              <div className="text-center">
                <div className="glow-ring mx-auto mb-7 grid h-24 w-24 place-items-center rounded-full border border-gold/60 bg-espresso text-gold">
                  <span className="font-serif text-[42px] leading-none">★</span>
                </div>
                <h2 className="foil font-serif text-[46px] font-semibold leading-none sm:text-[60px]">CONGRATULAZIONI!</h2>
                <p className="mx-auto mt-6 max-w-sm text-[16px] leading-relaxed text-ivory/90">You have earned a complimentary Tiramisu Box.</p>
                <div className="mx-auto mt-8 inline-flex flex-col items-center rounded-2xl border border-gold/40 bg-dark/40 px-8 py-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">Your reward</span>
                  <span className="mt-2 font-serif text-[26px] text-gold-soft">{data.settings.rewardName.toUpperCase()}</span>
                </div>
                <p className="mt-6 text-[13px] uppercase tracking-[0.24em] text-gold">Your reward is ready</p>
                <div className="mt-8 flex flex-col items-center gap-3">
                  <button className="btn-gold w-full sm:w-auto" onClick={() => setCelebrate(true)}>
                    Replay celebration
                  </button>
                  <p className="max-w-sm text-[12px] leading-relaxed text-ivory/65">
                    Show this card at the counter. Our team will confirm and redeem your Tiramisu Box.
                  </p>
                </div>
              </div>
            )}

            {state === "LOCKED" && (
              <LockedProgress count={customer.currentStamps} req={req} rewardName={data.settings.rewardName} />
            )}

            {state === "REDEEMED" && (
              <div className="text-center">
                <p className="eyebrow mb-4">Redeemed with love</p>
                <h2 className="display text-[44px] leading-[1.05] text-cream">Buon appetito!</h2>
                <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-ivory/80">
                  Your {data.settings.rewardName.toLowerCase()} has been enjoyed. A brand-new cycle has begun — collect {req} stamps for your next one.
                </p>
                <div className="mx-auto mt-8 grid max-w-xs grid-cols-2 gap-4 text-left">
                  <div className="rounded-2xl border border-gold/25 bg-dark/40 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Cycle</p>
                    <p className="mt-1 font-serif text-2xl">{customer.cycle}</p>
                  </div>
                  <div className="rounded-2xl border border-gold/25 bg-dark/40 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Stamps</p>
                    <p className="mt-1 font-serif text-2xl">0 / {req}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="reveal reveal-delay-2 space-y-6 lg:col-span-5">
          <div className="card-luxe flex flex-col items-center gap-5 p-7 text-center">
            <p className="eyebrow">Show at the counter</p>
            <QRCodeImage value={cardUrl(customer.id)} size={190} alt={`QR code for ${customer.id}`} />
            <div>
              <p className="font-mono text-[13px] tracking-[0.16em] text-espresso">{customer.id}</p>
              <p className="mt-1 text-[12px] text-muted">Scanning shows your name, ID, stamps and reward status only.</p>
            </div>
          </div>

          <div className="card-luxe p-7">
            <p className="eyebrow mb-4">Programme rules</p>
            <ol className="space-y-4 text-[14px] leading-relaxed text-choc/80">
              <li className="flex gap-4"><span className="font-serif text-xl italic text-gold">i.</span> 1 eligible purchase earns 1 stamp, confirmed by our cashier.</li>
              <li className="flex gap-4"><span className="font-serif text-xl italic text-gold">ii.</span> {req} stamps unlock {data.settings.rewardName.toLowerCase()}.</li>
              <li className="flex gap-4"><span className="font-serif text-xl italic text-gold">iii.</span> Rewards are redeemed in store. A new cycle begins after redemption.</li>
              <li className="flex gap-4"><span className="font-serif text-xl italic text-gold">iv.</span> Stamps and reward history are never deleted.</li>
            </ol>
          </div>

          <div className="card-luxe p-7">
            <p className="eyebrow mb-4">Reward history</p>
            {rewards.length === 0 ? (
              <p className="text-[14px] text-muted">No rewards yet — your first one is waiting to be earned.</p>
            ) : (
              <ul className="space-y-4">
                {rewards.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 border-b border-espresso/10 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-serif text-[18px] text-espresso">{r.name}</p>
                      <p className="mt-1 text-[12px] text-muted">
                        {r.status === "redeemed" && r.redeemedAt ? `Redeemed ${formatDateTime(r.redeemedAt)}` : `Unlocked ${formatDateTime(r.unlockedAt)}`}
                      </p>
                    </div>
                    <StatusBadge state={r.status === "redeemed" ? "REDEEMED" : "UNLOCKED"} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <Celebration
        open={celebrate && state === "UNLOCKED"}
        onClose={dismiss}
        rewardName={data.settings.rewardName}
        customerName={customer.name}
      />
    </div>
  );
}

function LockedProgress({ count, req, rewardName }: { count: number; req: number; rewardName: string }) {
  const remaining = Math.max(0, req - count);
  const pct = Math.min(1, count / req);
  const r = 96;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative grid h-[240px] w-[240px] place-items-center">
        <svg viewBox="0 0 240 240" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="120" cy="120" r={r} fill="none" stroke="rgba(199,161,106,0.18)" strokeWidth="6" />
          <circle
            cx="120"
            cy="120"
            r={r}
            fill="none"
            stroke="url(#goldRing)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-[1400ms] ease-out"
          />
          <defs>
            <linearGradient id="goldRing" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#8a6238" />
              <stop offset="50%" stopColor="#c7a16a" />
              <stop offset="100%" stopColor="#f1e2c3" />
            </linearGradient>
          </defs>
        </svg>
        <div>
          <p className="font-serif text-[64px] leading-none text-cream">
            {count}
            <span className="text-[30px] text-ivory/40"> / {req}</span>
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.26em] text-gold">Stamps</p>
        </div>
      </div>
      <h2 className="display mt-8 text-[34px] leading-tight text-cream">
        {remaining === 0 ? "Almost there." : `${formatNumber(remaining)} more ${remaining === 1 ? "stamp" : "stamps"} to go.`}
      </h2>
      <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-ivory/80">
        Collect {formatNumber(remaining)} more {remaining === 1 ? "stamp" : "stamps"} to unlock your complimentary {rewardName.replace(/^1 /, "").toLowerCase()}.
      </p>
    </div>
  );
}
