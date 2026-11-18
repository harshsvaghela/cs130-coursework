"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { customerHistory, customerRewards, findCustomerById, rewardStateFor, useDb, type Customer } from "@/lib/db";
import { formatDate, formatDateTime, formatMobile, formatNumber, formatTime } from "@/lib/format";
import { clearActiveCustomerId, getActiveCustomerId, cardUrl } from "@/lib/session";
import { toast } from "@/lib/toast";
import { StampCard } from "@/components/StampCard";
import { ActivityList } from "@/components/ActivityList";
import { EmptyState, Spinner, StatusBadge } from "@/components/ui";

export default function ProfilePage() {
  const data = useDb();
  const [ready, setReady] = useState(false);
  const [cid, setCid] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setCid(new URLSearchParams(window.location.search).get("cid"));
    setActiveId(getActiveCustomerId());
    setReady(true);
    const sync = () => setActiveId(getActiveCustomerId());
    window.addEventListener("casa-active-customer", sync);
    return () => window.removeEventListener("casa-active-customer", sync);
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const customer = findCustomerById(data, cid || activeId || "NONE");

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <EmptyState
          title="No profile to show yet"
          text="Join the loyalty club or find your card to see your profile, reward history and stamp activity."
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn-gold">
                Join Our Loyalty Club
              </Link>
              <Link href="/card" className="btn-ghost">
                Find my card
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return <Profile customer={customer} isOwnDevice={customer.id === activeId} />;
}

function Profile({ customer, isOwnDevice }: { customer: Customer; isOwnDevice: boolean }) {
  const data = useDb();
  const req = data.settings.stampRequirement;
  const state = rewardStateFor(data, customer);
  const rewards = customerRewards(data, customer.id);
  const history = customerHistory(data, customer.id);
  const initials = customer.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const redeemedCount = rewards.filter((r) => r.status === "redeemed").length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-16">
      {/* Identity header */}
      <section className="reveal flex flex-col gap-6 border-b border-espresso/10 pb-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-soft via-gold to-[#b08650] font-serif text-[28px] font-semibold text-espresso ring-1 ring-gold/60 shadow-soft md:h-24 md:w-24">
            {initials}
          </div>
          <div>
            <p className="eyebrow mb-2">Member profile</p>
            <h1 className="display text-[36px] leading-[1.05] text-espresso md:text-[48px]">{customer.name}</h1>
            <p className="mt-2 font-mono text-[12px] tracking-[0.16em] text-muted">
              {customer.id} · Card {customer.cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ").trim()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <StatusBadge state={state} />
          {!isOwnDevice && (
            <Link href={`/card?cid=${customer.id}`} className="btn-ghost !py-2.5">
              View card
            </Link>
          )}
        </div>
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-12">
        <div className="space-y-8 md:col-span-7">
          {/* Stats */}
          <section className="reveal reveal-delay-1 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "Current stamps", v: `${customer.currentStamps} / ${req}` },
              { k: "Lifetime stamps", v: formatNumber(customer.lifetimeStamps) },
              { k: "Current cycle", v: `Cycle ${customer.cycle}` },
              { k: "Rewards redeemed", v: formatNumber(redeemedCount) },
            ].map((s) => (
              <div key={s.k} className="card-luxe p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{s.k}</p>
                <p className="mt-2 font-serif text-[26px] leading-none text-espresso">{s.v}</p>
              </div>
            ))}
          </section>

          {/* Details */}
          <section className="reveal reveal-delay-2 card-luxe p-6 sm:p-8">
            <p className="eyebrow mb-5">Membership details</p>
            <dl className="grid gap-6 sm:grid-cols-2">
              <Detail label="Mobile number" value={formatMobile(customer.mobile)} />
              <Detail label="Email" value={customer.email || "Not provided"} />
              <Detail label="Registration date" value={`${formatDate(customer.registeredAt)} · ${formatTime(customer.registeredAt)}`} />
              <Detail label="Last stamp" value={customer.lastStampAt ? formatDateTime(customer.lastStampAt) : "No stamps yet"} />
            </dl>
          </section>

          {/* Reward history */}
          <section className="reveal reveal-delay-3 card-luxe p-6 sm:p-8">
            <p className="eyebrow mb-2">Reward history</p>
            <h2 className="display mb-6 text-[28px] text-espresso">Your Tiramisu Boxes</h2>
            {rewards.length === 0 ? (
              <p className="rounded-2xl bg-ivory/60 px-5 py-8 text-center text-[14px] text-muted">
                No rewards yet. Complete your {req}-stamp card to unlock your first {data.settings.rewardName.toLowerCase()}.
              </p>
            ) : (
              <ul className="space-y-3">
                {rewards.map((r) => (
                  <li key={r.id} className="flex flex-col gap-2 rounded-2xl border border-espresso/10 bg-white/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-serif text-[20px] text-espresso">{r.name}</p>
                      <p className="mt-1 text-[12px] text-muted">
                        Cycle {r.cycle} · Unlocked {formatDateTime(r.unlockedAt)}
                        {r.redeemedAt ? ` · Redeemed ${formatDateTime(r.redeemedAt)}` : ""}
                      </p>
                    </div>
                    <StatusBadge state={r.status === "redeemed" ? "REDEEMED" : "UNLOCKED"} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-8 md:col-span-5">
          <div className="reveal reveal-delay-2">
            <StampCard
              customer={customer}
              stampRequirement={req}
              rewardName={data.settings.rewardName}
              rewardState={state}
              qrValue={cardUrl(customer.id)}
              compact
            />
          </div>

          <section className="reveal reveal-delay-3 card-luxe p-6 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow mb-1">Transactions</p>
                <h2 className="display text-[26px] text-espresso">Stamp history</h2>
              </div>
              <span className="text-[12px] text-muted">{formatNumber(history.length)} entries</span>
            </div>
            <ActivityList txns={history} limit={12} emptyText="No transactions yet." />
          </section>

          {isOwnDevice && (
            <div className="reveal reveal-delay-4 space-y-3">
              <Link href="/reward" className="btn-espresso w-full">
                Reward status
              </Link>
              <button
                className="btn-ghost w-full"
                onClick={() => {
                  clearActiveCustomerId();
                  toast("Signed out of this card on this device.", "info");
                }}
              >
                Sign out of this card
              </button>
              <p className="text-center text-[12px] text-muted">Your card stays saved in the club. Find it again anytime with your mobile number.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted">{label}</dt>
      <dd className="mt-1.5 break-words text-[16px] font-medium text-espresso">{value}</dd>
    </div>
  );
}
