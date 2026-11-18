"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { registerCustomer, rewardStateFor, useDb, type Customer } from "@/lib/db";
import { formatDate, formatDateTime, formatMobile, normalizeMobile, validateEmail, validateName } from "@/lib/format";
import { cardUrl, setActiveCustomerId } from "@/lib/session";
import { StampCard } from "@/components/StampCard";
import { Field, Spinner } from "@/components/ui";
import { toast } from "@/lib/toast";

type FieldName = "name" | "mobile" | "email";

export default function RegisterPage() {
  const data = useDb();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({ name: false, mobile: false, email: false });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(formatDate(new Date()));
  }, []);

  const mobileDigits = normalizeMobile(mobile);
  const errors: Record<FieldName, string | null> = {
    name: validateName(name),
    mobile: mobile.trim() === "" ? "Please enter your mobile number." : mobileDigits ? null : "Enter a valid 10-digit Indian mobile number (starts with 6–9).",
    email: validateEmail(email),
  };
  const show = (f: FieldName) => submitted || touched[f];
  const touch = (f: FieldName) => setTouched((t) => ({ ...t, [f]: true }));

  const live = createdId ? data.customers.find((c) => c.id === createdId) : undefined;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    setServerError(null);
    setDuplicate(false);
    if (errors.name || errors.mobile || errors.email) return;
    setBusy(true);
    const res = registerCustomer({ name, mobile, email });
    setBusy(false);
    if (!res.ok) {
      if (res.error === "DUPLICATE") setDuplicate(true);
      else setServerError(res.error);
      return;
    }
    if (res.data) {
      setActiveCustomerId(res.data.id);
      setCreatedId(res.data.id);
      toast("Your loyalty card is ready", "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const resetForm = () => {
    setName("");
    setMobile("");
    setEmail("");
    setSubmitted(false);
    setTouched({ name: false, mobile: false, email: false });
    setCreatedId(null);
    setDuplicate(false);
  };

  /* ---------- Welcome screen after registration ---------- */
  if (live) {
    return <Welcome customer={live} req={data.settings.stampRequirement} rewardName={data.settings.rewardName} rewardState={rewardStateFor(data, live)} onAnother={resetForm} />;
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-5 py-10 md:grid-cols-12 md:px-8 md:py-20">
      {/* Editorial column */}
      <aside className="reveal md:col-span-5 md:pt-6">
        <p className="eyebrow mb-4">Dolce Fedeltà · Join</p>
        <h1 className="display text-[44px] leading-[1.02] text-espresso md:text-[60px]">
          Benvenuti <span className="italic text-choc">to the club.</span>
        </h1>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-choc/75">
          Registration takes less than a minute. Your personal Casa Tiramisù card and QR code are created instantly — and every stamp you earn is saved to your profile.
        </p>
        <div className="mt-10 overflow-hidden rounded-[28px] shadow-luxe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/tiramisu-jar.jpg" alt="Tiramisù served in a glass jar" className="aspect-[16/10] w-full object-cover" />
        </div>
        <ul className="mt-8 space-y-3 text-[14px] text-choc/75">
          <li className="flex gap-3"><span className="text-gold">✦</span> Your mobile number is used only to identify your card at the counter.</li>
          <li className="flex gap-3"><span className="text-gold">✦</span> Your QR code contains only your Customer ID — never your personal details.</li>
        </ul>
      </aside>

      {/* Form */}
      <section className="reveal reveal-delay-2 md:col-span-7">
        <form onSubmit={onSubmit} noValidate className="card-luxe relative overflow-hidden p-6 sm:p-10" aria-label="Customer registration">
          <div className="hairline absolute inset-x-0 top-0" />
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="display text-[30px] text-espresso">Create your card</h2>
              <p className="mt-1 text-[13px] text-muted">Fields marked with * are required.</p>
            </div>
            <div className="hidden rounded-2xl border border-gold/40 px-4 py-2 text-right sm:block">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Registration date</p>
              <p className="font-serif text-[18px] text-espresso" suppressHydrationWarning>{today || "—"}</p>
            </div>
          </div>

          <div className="space-y-6">
            <Field label="Full name *" htmlFor="reg-name" error={show("name") ? errors.name : null}>
              <input
                id="reg-name"
                className={`field ${show("name") && errors.name ? "field-invalid" : ""}`}
                placeholder="As you would like it on your card"
                autoComplete="name"
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => touch("name")}
                aria-invalid={show("name") && !!errors.name}
              />
            </Field>

            <Field
              label="Indian mobile number *"
              htmlFor="reg-mobile"
              error={show("mobile") ? errors.mobile : null}
              hint={!show("mobile") || errors.mobile ? "Used to find your card. Format: +91 98765 43210" : `Verified format: ${formatMobile(mobileDigits || "")}`}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-choc/70">+91</span>
                <input
                  id="reg-mobile"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  className={`field pl-14 ${show("mobile") && errors.mobile ? "field-invalid" : ""}`}
                  value={mobile}
                  maxLength={16}
                  onChange={(e) => setMobile(e.target.value)}
                  onBlur={() => touch("mobile")}
                  aria-invalid={show("mobile") && !!errors.mobile}
                />
              </div>
            </Field>

            <Field label="Email (optional)" htmlFor="reg-email" error={show("email") ? errors.email : null} hint="For tiramisu news and your monthly stamp summary.">
              <input
                id="reg-email"
                type="email"
                className={`field ${show("email") && errors.email ? "field-invalid" : ""}`}
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => touch("email")}
                aria-invalid={show("email") && !!errors.email}
              />
            </Field>
          </div>

          {duplicate && (
            <div role="alert" className="mt-7 rounded-2xl border border-gold/40 bg-gold/10 p-5 text-[14px] text-choc">
              <p className="font-semibold text-espresso">This mobile number is already a member.</p>
              <p className="mt-1">Each mobile number can hold one loyalty card. Find your existing card instead.</p>
              <Link href={`/card?m=${mobileDigits || ""}`} className="mt-3 inline-block font-semibold text-choc underline underline-offset-4 hover:text-gold">
                Find my card →
              </Link>
            </div>
          )}
          {serverError && (
            <p role="alert" className="mt-7 rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-red-900">
              {serverError}
            </p>
          )}

          <div className="mt-10 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] leading-relaxed text-muted">
              By joining you agree to hold a loyalty card at Casa Tiramisù. Demo: data is stored on this device.
            </p>
            <button type="submit" className="btn-espresso w-full sm:w-auto" disabled={busy}>
              {busy ? <Spinner /> : null} Join Our Loyalty Club
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-[14px] text-muted">
          Already a member?{" "}
          <Link href="/card" className="font-semibold text-choc underline underline-offset-4 hover:text-gold">
            View my card
          </Link>
        </p>
      </section>
    </div>
  );
}

function Welcome({
  customer,
  req,
  rewardName,
  rewardState,
  onAnother,
}: {
  customer: Customer;
  req: number;
  rewardName: string;
  rewardState: "LOCKED" | "UNLOCKED" | "REDEEMED";
  onAnother: () => void;
}) {
  const first = customer.name.split(" ")[0];
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-20">
      <div className="reveal text-center">
        <p className="eyebrow mb-4">Registration complete</p>
        <h1 className="display text-[44px] leading-[1.02] text-espresso md:text-[64px]">
          Benvenuto, <span className="italic text-choc">{first}.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-choc/75">
          Your Casa Tiramisù loyalty card is ready. Show your QR code at the counter after each eligible purchase — the cashier will add your stamp.
        </p>
      </div>

      <div className="reveal reveal-delay-2 mx-auto mt-12 max-w-2xl">
        <StampCard
          customer={customer}
          stampRequirement={req}
          rewardName={rewardName}
          rewardState={rewardState}
          qrValue={cardUrl(customer.id)}
        />
      </div>

      <div className="reveal reveal-delay-3 mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
        {[
          ["Customer ID", customer.id],
          ["Registered", formatDateTime(customer.registeredAt)],
          ["Mobile", formatMobile(customer.mobile)],
        ].map(([k, v]) => (
          <div key={k} className="card-luxe p-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted">{k}</p>
            <p className="mt-2 break-words font-serif text-[17px] text-espresso">{v}</p>
          </div>
        ))}
      </div>

      <div className="reveal reveal-delay-4 mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/profile" className="btn-espresso">
          Open my profile
        </Link>
        <Link href="/card" className="btn-ghost">
          View my card
        </Link>
        <button onClick={onAnother} className="btn-ghost">
          Register another guest
        </button>
      </div>
      <p className="mx-auto mt-8 max-w-md text-center text-[12px] leading-relaxed text-muted">
        Tip: take a screenshot of your card to keep it handy. Show the QR code at the counter after each eligible purchase.
      </p>
    </div>
  );
}
