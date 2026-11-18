"use client";

import Link from "next/link";
import { useDb } from "@/lib/db";
import { CoffeeBean } from "@/components/ui";

const STEPS = [
  {
    no: "01",
    title: "Join with your mobile",
    text: "Share your name and Indian mobile number. Your digital card is ready in seconds — no app to install.",
  },
  {
    no: "02",
    title: "Show your QR at the counter",
    text: "Open My Card and present your personal QR code. It carries only your Customer ID — nothing personal.",
  },
  {
    no: "03",
    title: "Collect a stamp per purchase",
    text: "Every eligible Tiramisu purchase earns one beautifully inked stamp, confirmed by our team.",
  },
  {
    no: "04",
    title: "Unlock your Tiramisu Box",
    text: "Complete your card and the celebration begins. Redeem your complimentary box at the counter.",
  },
];

const GALLERY = [
  { src: "/images/tiramisu-jar.jpg", title: "Il Vasetto", note: "Espresso-soaked savoiardi, mascarpone cream", tall: true },
  { src: "/images/tiramisu-hero.jpg", title: "La Fetta", note: "Hand-layered, dusted with Dutch cocoa", tall: false },
  { src: "/images/tiramisu-box.jpg", title: "La Scatola", note: "Signature gift box, champagne ribbon", tall: false },
];

export default function HomePage() {
  const { settings } = useDb();
  const req = settings.stampRequirement;

  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <section className="relative bg-dark text-cream">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #c7a16a 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-12 md:gap-10 md:px-8 md:pb-28 md:pt-20">
          <div className="reveal md:col-span-6 lg:col-span-6">
            <div className="flex items-center gap-4">
              <span className="h-px w-10 bg-gold" />
              <p className="eyebrow">Dolce Fedeltà</p>
            </div>
            <p className="mt-6 font-serif text-[15px] uppercase tracking-[0.5em] text-ivory/70">Casa Tiramisù</p>
            <h1 className="display mt-5 text-[46px] leading-[1.02] text-cream sm:text-[60px] md:text-[64px] lg:text-[76px]">
              A little sweetness.
              <span className="mt-1 block italic text-gold-soft">A lasting reward.</span>
            </h1>
            <p className="mt-7 max-w-md text-[16px] leading-relaxed text-ivory/80">
              Join our loyalty club and let every Tiramisù you enjoy bring you closer to a complimentary Tiramisu Box. One stamp per eligible
              purchase, {req} stamps for your reward — all on a digital card you carry in your pocket.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn-gold">
                Join Our Loyalty Club
              </Link>
              <Link href="/card" className="btn-ghost-light">
                View My Card
              </Link>
            </div>
            <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-cream/10 pt-8">
              {[
                { k: `${req}`, v: "stamps to reward" },
                { k: "1", v: "Tiramisu Box" },
                { k: "0", v: "apps to install" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="sr-only">{s.v}</dt>
                  <dd className="font-serif text-[34px] leading-none text-gold">{s.k}</dd>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted">{s.v}</p>
                </div>
              ))}
            </dl>
          </div>

          <div className="reveal reveal-delay-2 relative md:col-span-6">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-t-[220px] rounded-b-[28px] border border-gold/40 shadow-luxe">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/tiramisu-hero.jpg" alt="A slice of Casa Tiramisù layered with mascarpone and espresso-soaked savoiardi" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/70 via-transparent to-transparent" />
            </div>
            {/* Sample card preview */}
            <div className="absolute -bottom-6 left-3 hidden w-60 rotate-[-4deg] rounded-[22px] border border-gold/40 bg-espresso p-5 shadow-luxe sm:block md:-left-8">
              <p className="text-[10px] uppercase tracking-[0.28em] text-gold">Sample card</p>
              <p className="mt-2 font-serif text-2xl">3 <span className="text-base text-ivory/50">/ {req} stamps</span></p>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {Array.from({ length: Math.min(req, 8) }, (_, i) => (
                  <span key={i} className={`grid aspect-square place-items-center rounded-full ${i < 3 ? "bg-choc text-gold" : "border border-gold/30"}`}>
                    {i < 3 && <CoffeeBean className="h-3.5 w-3.5" />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <section className="border-b border-espresso/10 bg-ivory/60">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 text-center sm:grid-cols-3 md:px-8">
          {["Handmade in small batches", "Recorded instantly on your card", "Indian mobile · INR pricing · IST hours"].map((t) => (
            <p key={t} className="font-serif text-[18px] italic text-choc">
              {t}
            </p>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-32">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">How it works</p>
          <h2 className="display text-[40px] leading-[1.05] text-espresso md:text-[56px]">Four quiet steps to your next Tiramisù on us.</h2>
        </div>
        <ol className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.no} className={`card-luxe reveal p-7 transition hover:-translate-y-1 hover:shadow-luxe reveal-delay-${Math.min(i + 1, 4)}`}>
              <span className="font-serif text-[46px] italic leading-none text-gold">{s.no}</span>
              <h3 className="mt-6 text-[24px] leading-tight text-espresso">{s.title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-choc/75">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* REWARDS */}
      <section id="rewards" className="panel-dark relative text-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:grid-cols-2 md:px-8 md:py-32">
          <div className="relative order-2 md:order-1">
            <div className="overflow-hidden rounded-[32px] border border-gold/30 shadow-luxe">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/tiramisu-box.jpg" alt="Casa Tiramisù gift box with a champagne gold ribbon" className="aspect-[5/4] w-full object-cover" />
            </div>
            <div className="absolute -right-4 -top-4 hidden h-28 w-28 place-items-center rounded-full border border-gold/60 bg-espresso text-center shadow-luxe sm:grid">
              <div>
                <p className="font-serif text-[30px] leading-none text-gold">{req}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-ivory/70">Stamps</p>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="eyebrow mb-4">The reward</p>
            <h2 className="display text-[40px] leading-[1.05] md:text-[52px]">
              {settings.rewardName.replace(/^1 /, "One ")}, <span className="italic text-gold-soft">complimentary.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-ivory/80">{settings.programDescription}</p>
            <ul className="mt-10 space-y-5">
              {[
                ["1 eligible purchase", "earns 1 stamp on your card."],
                [`${req} stamps`, `unlock your ${settings.rewardName.toLowerCase()}.`],
                ["Redeem in store", "our team confirms your reward; a new cycle starts instantly."],
                ["History preserved", "every stamp and reward stays on record for your profile."],
              ].map(([a, b]) => (
                <li key={a} className="flex gap-4">
                  <span className="mt-2 h-px w-7 shrink-0 bg-gold" />
                  <p className="text-[15px] leading-relaxed text-ivory/85">
                    <strong className="font-semibold text-cream">{a}</strong> {b}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn-gold">
                Start my card
              </Link>
              <Link href="/reward" className="btn-ghost-light">
                See reward details
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-32">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow mb-4">The gallery</p>
            <h2 className="display text-[40px] leading-[1.05] text-espresso md:text-[56px]">Made for slow afternoons.</h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-choc/70">
            Mascarpone whipped to silk, espresso from a single origin, and Dutch cocoa dusted at the last moment.
          </p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {GALLERY.map((g) => (
            <figure key={g.title} className={`group relative overflow-hidden rounded-[28px] bg-dark shadow-soft ${g.tall ? "md:row-span-1" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.src} alt={`${g.title} — ${g.note}`} className="aspect-[4/5] w-full object-cover transition duration-[1400ms] group-hover:scale-105" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-dark/90 to-transparent p-6 pt-20 text-cream">
                <p className="font-serif text-[26px] italic">{g.title}</p>
                <p className="mt-1 text-[12px] uppercase tracking-[0.18em] text-ivory/70">{g.note}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* JOIN CTA */}
      <section className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="relative overflow-hidden rounded-[36px] bg-espresso px-8 py-16 text-center text-cream ring-1 ring-gold/30 md:px-16 md:py-20">
          <div className="hairline absolute inset-x-0 top-0" />
          <p className="eyebrow mb-5">Membership</p>
          <h2 className="display mx-auto max-w-2xl text-[40px] leading-[1.05] md:text-[56px]">Your card is one scan away.</h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-ivory/75">
            Register in under a minute with your name and Indian mobile number. Your QR code and stamp card are ready immediately.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-gold">
              Join Our Loyalty Club
            </Link>
            <Link href="/card" className="btn-ghost-light">
              View My Card
            </Link>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-6xl px-6 py-24 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow mb-4">Contact</p>
            <h2 className="display text-[40px] leading-[1.05] text-espresso md:text-[52px]">Come and say ciao.</h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-choc/70">
              Questions about the loyalty club, a custom order, or your stamp card? Our team is happy to help.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-7">
            <a href={`tel:${settings.businessPhone.replace(/\s/g, "")}`} className="card-luxe group p-7 transition hover:-translate-y-0.5 hover:shadow-luxe">
              <p className="eyebrow mb-3">Call</p>
              <p className="font-serif text-[24px] text-espresso group-hover:text-choc">{settings.businessPhone}</p>
              <p className="mt-2 text-[13px] text-muted">Daily, 11:00 AM – 10:00 PM IST</p>
            </a>
            <a href={`mailto:${settings.businessEmail}`} className="card-luxe group p-7 transition hover:-translate-y-0.5 hover:shadow-luxe">
              <p className="eyebrow mb-3">Write</p>
              <p className="break-all font-serif text-[22px] text-espresso group-hover:text-choc">{settings.businessEmail}</p>
              <p className="mt-2 text-[13px] text-muted">We reply within one working day</p>
            </a>
            <div className="card-luxe p-7 sm:col-span-2">
              <p className="eyebrow mb-3">Visit the boutique</p>
              <p className="font-serif text-[24px] text-espresso">{settings.businessAddress}</p>
              <p className="mt-2 text-[13px] text-muted">Dine-in, takeaway and loyalty redemption available at all times during opening hours.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
