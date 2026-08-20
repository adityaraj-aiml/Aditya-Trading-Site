import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Check, TrendingUp, Zap, Shield, Layers, Play, Star, Target, Send, Instagram, Mail, Maximize2 } from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal, MaskLines } from "@/components/Reveal";
import { INR } from "@/lib/api";
import { useBuy } from "@/hooks/useBuy";
import SignalChart from "@/components/SignalChart";

const HERO_IMG =
  "https://images.unsplash.com/photo-1510519138101-570d1dca3d66?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjB0cmFkaW5nJTIwc2V0dXAlMjBkZXNrJTIwZGFya3xlbnwwfHx8fDE3ODcyMDU3Mzl8MA&ixlib=rb-4.1.0&q=85";
const COURSE_IMG =
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzV8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMHRyYWRpbmclMjBjaGFydCUyMGRhdGElMjBkYXJrfGVufDB8fHx8MTc4NzIwNTczOXww&ixlib=rb-4.1.0&q=85";

// Real indicator proof screenshots provided by Raj
const PROOF = {
  main: "https://customer-assets-agu9un31.emergentagent.net/job_techin-marketplace/artifacts/rficnssw_Screenshot%202026-08-05%20160403%20-%20Copy.png",
  tps5: "https://customer-assets-agu9un31.emergentagent.net/job_techin-marketplace/artifacts/87vf52gf_Screenshot%202026-07-22%20123147%20-%20Copy.png",
  dash: "https://customer-assets-agu9un31.emergentagent.net/job_techin-marketplace/artifacts/5e8fj0an_Screenshot%202026-07-25%20084519%20-%20Copy.png",
  crop: "https://customer-assets-agu9un31.emergentagent.net/job_techin-marketplace/artifacts/yv7rgyfo_Screenshot%202026-07-25%20083320%20-%20Copy.png",
  zone: "https://customer-assets-agu9un31.emergentagent.net/job_techin-marketplace/artifacts/dql2a6en_Screenshot%202026-07-22%20113254%20-%20Copy.png",
};

const SOCIALS = {
  telegram: "https://t.me/themindfultrader",
  instagram: "https://www.instagram.com/aditya__raj02/",
  email: "withadityat@gmail.com",
};

export default function Landing() {
  return (
    <main>
      <Hero />
      <Marquee />
      <Indicator />
      <Proof />
      <Method />
      <Courses />
      <Pricing />
      <Faq />
      <FinalCta />
    </main>
  );
}

/* ------------------------------------------------------------------ HERO */
function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const yText = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const { buy, loadingId } = useBuy();

  return (
    <section ref={ref} className="relative min-h-screen flex items-end overflow-hidden grid-lines pt-32 pb-16">
      <motion.div style={{ y: yImg }} className="absolute inset-0 z-0">
        <img src={HERO_IMG} alt="Trading desk" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-[#050505]/40" />
      </motion.div>

      <motion.div style={{ y: yText }} className="relative z-10 max-w-[1400px] mx-auto w-full px-6 md:px-10">
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="label mb-6 flex items-center gap-3">
          <span className="w-8 h-px bg-[#E2FF4A]" /> Designed by Raj · Trusted by traders
        </motion.p>

        <MaskLines
          className="font-display font-black tracking-[-0.04em] leading-[0.82] text-[15vw] md:text-[11vw]"
          lines={[
            <span key="1" className="inline-flex items-start">
              TECHIN
              <sup className="font-mono font-medium text-[#E2FF4A] text-[2.2vw] md:text-[1.1vw] tracking-normal ml-[0.15em] mt-[0.4em]">
                ®
              </sup>
            </span>,
            <span key="2">
              <span className="text-outline italic pr-[0.06em]">BY</span>
              {" "}
              <span className="text-[#E2FF4A]">RAJ</span>
              <span className="text-[#E2FF4A]">.</span>
            </span>,
          ]}
        />
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="origin-left h-[3px] w-[38%] max-w-[420px] bg-[#E2FF4A] mt-4 accent-glow"
        />

        <div className="grid md:grid-cols-12 gap-8 mt-10 items-end">
          <Reveal delay={0.5} className="md:col-span-6">
            <p className="text-lg text-zinc-300 leading-relaxed max-w-xl">
              A fully customisable trading indicator built for <span className="text-white font-medium">beginner and pro traders</span> alike —
              it reads momentum across timeframes, plus the courses that teach you to trade it. Precision tools, real education, zero fluff.
            </p>
          </Reveal>
          <Reveal delay={0.65} className="md:col-span-6 flex flex-wrap gap-4 md:justify-end">
            <button
              onClick={() => buy("indicator_pro")}
              disabled={loadingId === "indicator_pro"}
              className="group flex items-center gap-2 bg-[#E2FF4A] text-black font-medium px-7 py-4 rounded-full hover:bg-[#C8E631] hover:scale-[0.98] transition-transform duration-200 accent-glow"
              data-testid="hero-buy-indicator">
              Get the indicator — {INR(5499)}
              <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
            <a href="#courses"
              className="flex items-center gap-2 border border-white/20 px-7 py-4 rounded-full text-white hover:border-white/50 hover:bg-white/5 transition-colors"
              data-testid="hero-view-courses">
              <Play size={16} /> Explore courses
            </a>
          </Reveal>
        </div>

        <Reveal delay={0.8} className="mt-16 grid grid-cols-3 gap-6 max-w-2xl border-t border-white/10 pt-8">
          {[["3", "Products live"], ["12+", "Timeframes read"], ["100%", "Built by Raj"]].map(([n, l]) => (
            <div key={l}>
              <p className="font-display font-extrabold text-3xl md:text-4xl">{n}</p>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider mt-1">{l}</p>
            </div>
          ))}
        </Reveal>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ MARQUEE */
function Marquee() {
  const items = ["MOMENTUM", "PRICE ACTION", "RISK CONTROL", "MULTI-TIMEFRAME", "CLEAN SIGNALS", "PSYCHOLOGY"];
  const row = [...items, ...items];
  return (
    <div className="bg-[#E2FF4A] text-black py-4 overflow-hidden border-y border-black/10" data-testid="marquee">
      <div className="marquee-track">
        {row.map((t, i) => (
          <span key={i} className="font-display font-extrabold text-xl md:text-2xl mx-8 flex items-center gap-8 uppercase tracking-tight">
            {t} <Star size={16} className="fill-black" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ INDICATOR */
function Indicator() {
  const { buy, loadingId } = useBuy();
  const features = [
    { icon: Target, t: "5 dynamic targets", d: "Plots up to 5 profit targets drawn from live support & resistance, adapting to current market structure." },
    { icon: TrendingUp, t: "Multi-timeframe momentum", d: "Reads trend strength across 12+ timeframes and shows you the confluence at a glance." },
    { icon: Zap, t: "Clean, non-repainting signals", d: "High-accuracy entry and exit markers that stay put — no repainting, no second-guessing." },
    { icon: Shield, t: "Built-in risk zones", d: "Auto-plotted support, resistance & invalidation levels so your stop is defined before you enter." },
    { icon: Layers, t: "Works on any market", d: "Forex, crypto, indices or stocks — the logic adapts to what you trade." },
  ];
  return (
    <section id="indicator" className="relative py-28 md:py-40 px-6 md:px-10">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-12 gap-6 items-start">
          <Reveal className="md:col-span-5 md:sticky md:top-28">
            <p className="label mb-5">01 — The Indicator</p>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-[0.95] mb-6">
              The Techin<br />Momentum<br /><span className="text-[#E2FF4A]">Indicator.</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8 max-w-md">
              My signature tool, refined over years of live trading and fully customisable for both
              beginners and pros. It delivers <span className="text-white font-medium">high-accuracy signals</span> and keeps you
              focused on <span className="text-white font-medium">real, tradable moves only</span> — no noise, no guesswork.
            </p>
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display font-extrabold text-4xl">{INR(5499)}</span>
              <span className="text-sm text-zinc-500 font-mono">one-time · lifetime updates</span>
            </div>
            <button
              onClick={() => buy("indicator_pro")}
              disabled={loadingId === "indicator_pro"}
              className="flex items-center gap-2 bg-[#E2FF4A] text-black font-medium px-7 py-4 rounded-full hover:bg-[#C8E631] hover:scale-[0.98] transition-transform duration-200"
              data-testid="indicator-buy-btn">
              {loadingId === "indicator_pro" ? "Loading…" : "Buy the indicator"}
              <ArrowUpRight size={18} />
            </button>
          </Reveal>

          <div className="md:col-span-7 md:col-start-6">
            <Reveal className="relative mb-10">
              <SignalChart />
            </Reveal>
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <Reveal key={f.t} delay={i * 0.08}>
                  <div className="group border border-white/10 p-6 rounded-xl bg-[#0A0A0A] hover:-translate-y-1 hover:border-[#E2FF4A]/40 transition-all duration-300 h-full">
                    <f.icon size={22} className="text-[#E2FF4A] mb-4" />
                    <h3 className="font-display font-bold text-lg mb-2">{f.t}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{f.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ PROOF */
function ProofFrame({ src, caption, className = "", tall = false }) {
  return (
    <a href={src} target="_blank" rel="noopener noreferrer"
      className={`group relative block border border-white/10 rounded-xl overflow-hidden bg-[#0A0A0A] hover:border-[#E2FF4A]/40 transition-colors h-full flex flex-col ${className}`}>
      <div className={`relative bg-black grid place-items-center overflow-hidden ${tall ? "aspect-[16/7]" : "aspect-[16/9]"}`}>
        <img src={src} alt={caption} loading="lazy"
          className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500" />
        <div className="absolute top-3 right-3 grid place-items-center w-8 h-8 rounded-full glass text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 size={14} />
        </div>
      </div>
      <div className="p-4 border-t border-white/10 flex-1">
        <p className="text-xs md:text-sm text-zinc-300 leading-snug">{caption}</p>
      </div>
    </a>
  );
}

function Proof() {
  const legend = [
    { tag: "LONG / SHORT", d: "Auto entry signals printed directly on the candles — no guessing where to enter." },
    { tag: "TP1 – TP5", d: "Up to five take-profit targets drawn from live support & resistance, marked HIT as price reaches them." },
    { tag: "BE (Break-Even)", d: "Once TP1 hits, your stop trails to entry — the trade becomes risk-free." },
    { tag: "Confluence score", d: "A live read of how many conditions align, so you only take high-quality setups." },
  ];
  return (
    <section id="results" className="relative py-28 md:py-40 px-6 md:px-10">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <Reveal>
            <p className="label mb-5">02 — Proof</p>
            <h2 className="font-display font-extrabold text-4xl md:text-6xl tracking-tighter leading-[0.95]">
              Real trades.<br />Real targets hit.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-zinc-400 max-w-sm">
              Actual screenshots from my own charts — LONG/SHORT entries and TP1–TP5 targets hitting, live on BTCUSD.
            </p>
          </Reveal>
        </div>

        {/* featured chart + side legend */}
        <div className="grid md:grid-cols-12 gap-6 items-stretch mb-6">
          <Reveal className="md:col-span-8">
            <ProofFrame src={PROOF.main} tall
              caption="XAUUSD (Gold) — a LONG signal riding straight through TP1, TP2, TP3 & TP4 (all HIT), with the stop trailed to break-even (BE)." />
          </Reveal>
          <Reveal delay={0.1} className="md:col-span-4">
            <div className="h-full border border-white/10 rounded-xl bg-[#0A0A0A] p-7 flex flex-col">
              <p className="label mb-5">How to read it</p>
              <ul className="space-y-5 flex-1">
                {legend.map((l) => (
                  <li key={l.tag}>
                    <p className="font-display font-bold text-base mb-1 text-[#E2FF4A]">{l.tag}</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">{l.d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        {/* supporting shots */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Reveal>
            <ProofFrame src={PROOF.tps5}
              caption="BTCUSD — all five targets (TP1 HIT) mapped from live structure, with break-even protection." />
          </Reveal>
          <Reveal delay={0.08}>
            <ProofFrame src={PROOF.dash}
              caption="The Aditya Sniper Entry indicator: a SHORT with clear SL, ENTRY and TP1–TP4 auto-plotted." />
          </Reveal>
          <Reveal delay={0.16}>
            <ProofFrame src={PROOF.crop}
              caption="Back-to-back LONG & SHORT calls, each with defined entry, stop and targets." />
          </Reveal>
          <Reveal delay={0.24}>
            <ProofFrame src={PROOF.zone}
              caption="LONG/SHORT signals with the highlighted demand zone the entry is built on." />
          </Reveal>
        </div>

        {/* follow / connect */}
        <Reveal delay={0.1}>
          <div className="mt-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-t border-white/10 pt-8">
            <p className="text-zinc-400 text-sm max-w-md">
              Follow along for live setups & updates, or reach out with any questions before you buy.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={SOCIALS.telegram} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 border border-white/15 px-5 py-2.5 rounded-full text-sm hover:border-[#E2FF4A] hover:text-[#E2FF4A] transition-colors" data-testid="proof-telegram">
                <Send size={15} /> Telegram
              </a>
              <a href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 border border-white/15 px-5 py-2.5 rounded-full text-sm hover:border-[#E2FF4A] hover:text-[#E2FF4A] transition-colors" data-testid="proof-instagram">
                <Instagram size={15} /> Instagram
              </a>
              <a href={`mailto:${SOCIALS.email}`}
                className="flex items-center gap-2 border border-white/15 px-5 py-2.5 rounded-full text-sm hover:border-[#E2FF4A] hover:text-[#E2FF4A] transition-colors" data-testid="proof-email">
                <Mail size={15} /> Email
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ METHOD */
function Method() {
  const chapters = [
    { n: "01", t: "See the structure", d: "Learn to read market structure the way it actually moves — highs, lows and the intent behind them." },
    { n: "02", t: "Wait for confluence", d: "Stack the indicator's momentum read with price action so every entry has a reason." },
    { n: "03", t: "Manage the risk", d: "Define invalidation first. Size positions so no single trade can hurt you." },
    { n: "04", t: "Repeat with discipline", d: "Turn a repeatable process into a habit. Consistency beats intensity, every time." },
  ];
  return (
    <section id="method" className="relative py-28 md:py-40 px-6 md:px-10 bg-[#0A0A0A] border-y border-white/10">
      <div className="max-w-[1400px] mx-auto">
        <Reveal>
          <p className="label mb-5">03 — The Method</p>
          <h2 className="font-display font-extrabold text-4xl md:text-6xl tracking-tighter leading-[0.95] max-w-3xl mb-16">
            A process, not a<br />promise.
          </h2>
        </Reveal>
        <div className="space-y-0">
          {chapters.map((c, i) => (
            <Reveal key={c.n} delay={i * 0.05}>
              <div className="group grid md:grid-cols-12 gap-6 items-center py-8 border-t border-white/10 hover:bg-white/[0.02] transition-colors">
                <span className="md:col-span-2 font-display font-black text-5xl md:text-6xl text-zinc-800 group-hover:text-[#E2FF4A] transition-colors">
                  {c.n}
                </span>
                <h3 className="md:col-span-4 font-display font-bold text-2xl md:text-3xl tracking-tight">{c.t}</h3>
                <p className="md:col-span-6 text-zinc-400 leading-relaxed">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ COURSES */
function Courses() {
  const { buy, loadingId } = useBuy();
  const courses = [
    {
      id: "course_beginner", tag: "Beginner", price: 2999,
      title: "Beginner Trader Course",
      desc: "Everything a new trader needs — charts, price action basics, risk and the psychology to survive the early days.",
      points: ["8+ hours of lessons", "Charting fundamentals", "How to become a profitable trader", "Lifetime access"],
    },
    {
      id: "course_pro", tag: "Pro", price: 7999, featured: true,
      title: "Pro Trader Masterclass",
      desc: "Advanced playbooks and my personal strategy from 4 years of live trading — the exact way I use the Techin indicator to find high-conviction, profitable setups.",
      points: ["20+ hours advanced content", "My personal 4-year strategy", "The path to consistent profits", "1-on-1 doubt solving"],
    },
  ];
  return (
    <section id="courses" className="relative py-28 md:py-40 px-6 md:px-10">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <Reveal>
            <p className="label mb-5">04 — Education</p>
            <h2 className="font-display font-extrabold text-4xl md:text-6xl tracking-tighter leading-[0.95]">
              Video courses for<br />every level.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-zinc-400 max-w-sm">
              From your first candle to full-time conviction. Learn the exact framework behind the indicator.
            </p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {courses.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.1}>
              <div className={`group relative rounded-xl overflow-hidden border h-full flex flex-col ${
                c.featured ? "border-[#E2FF4A]/40 bg-[#0A0A0A]" : "border-white/10 bg-[#0A0A0A]"
              }`}>
                <div className="relative h-52 overflow-hidden">
                  <img src={COURSE_IMG} alt={c.title} className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-75 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
                  <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
                    c.featured ? "bg-[#E2FF4A] text-black" : "glass text-white"
                  }`}>{c.tag}</span>
                  <div className="absolute bottom-4 left-4 grid place-items-center w-12 h-12 rounded-full bg-[#E2FF4A] text-black">
                    <Play size={18} className="fill-black" />
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-1">
                  <h3 className="font-display font-extrabold text-2xl tracking-tight mb-3">{c.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-6">{c.desc}</p>
                  <ul className="space-y-2.5 mb-8">
                    {c.points.map((p) => (
                      <li key={p} className="flex items-center gap-3 text-sm text-zinc-300">
                        <Check size={15} className="text-[#E2FF4A] shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-display font-extrabold text-2xl">{INR(c.price)}</span>
                    <button
                      onClick={() => buy(c.id)}
                      disabled={loadingId === c.id}
                      className={`flex items-center gap-2 font-medium px-6 py-3 rounded-full transition-transform duration-200 hover:scale-[0.98] ${
                        c.featured ? "bg-[#E2FF4A] text-black hover:bg-[#C8E631]" : "border border-white/20 text-white hover:border-white/50"
                      }`}
                      data-testid={`course-buy-${c.id}`}>
                      {loadingId === c.id ? "Loading…" : "Enroll"} <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ PRICING */
function Pricing() {
  const { buy, loadingId } = useBuy();
  const plans = [
    { id: "course_beginner", name: "Beginner Course", price: 2999, sub: "Start from zero", feats: ["8+ hrs lessons", "Fundamentals", "Path to profitability", "Lifetime access"] },
    { id: "indicator_pro", name: "The Indicator", price: 5499, sub: "Most popular", featured: true, feats: ["Signature indicator", "5 dynamic targets", "Support & resistance zones", "Fully customisable", "Lifetime updates"] },
    { id: "course_pro", name: "Pro Masterclass", price: 7999, sub: "Go full-time", feats: ["20+ hrs advanced", "My 4-year strategy", "1-on-1 doubt solving", "Community access"] },
  ];
  return (
    <section id="pricing" className="relative py-28 md:py-40 px-6 md:px-10 bg-[#0A0A0A] border-y border-white/10">
      <div className="max-w-[1400px] mx-auto">
        <Reveal className="mb-16">
          <p className="label mb-5">05 — Pricing</p>
          <h2 className="font-display font-extrabold text-4xl md:text-6xl tracking-tighter leading-[0.95] max-w-2xl">
            Own it once.<br />Trade it forever.
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08} className="h-full">
              <div className={`relative rounded-xl p-8 h-full flex flex-col border ${
                p.featured ? "border-[#E2FF4A] bg-[#111] accent-glow md:-translate-y-4" : "border-white/10 bg-[#111]"
              }`} data-testid={`pricing-card-${p.id}`}>
                {p.featured && (
                  <span className="absolute -top-3 left-8 bg-[#E2FF4A] text-black text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full">
                    {p.sub}
                  </span>
                )}
                <p className="label !text-zinc-500 mb-4">{!p.featured && p.sub}</p>
                <h3 className="font-display font-extrabold text-xl mb-4">{p.name}</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="font-display font-black text-4xl">{INR(p.price)}</span>
                  <span className="text-xs text-zinc-500 font-mono">one-time</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.feats.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                      <Check size={15} className="text-[#E2FF4A] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => buy(p.id)}
                  disabled={loadingId === p.id}
                  className={`w-full flex items-center justify-center gap-2 font-medium py-3.5 rounded-full transition-transform duration-200 hover:scale-[0.99] ${
                    p.featured ? "bg-[#E2FF4A] text-black hover:bg-[#C8E631]" : "border border-white/20 text-white hover:border-white/50"
                  }`}
                  data-testid={`pricing-buy-${p.id}`}>
                  {loadingId === p.id ? "Loading…" : "Get started"}
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ FAQ */
function Faq() {
  const faqs = [
    { q: "How do I get the indicator after buying?", a: "The moment your payment succeeds, the indicator is unlocked in your dashboard along with access instructions. It's instant." },
    { q: "Which platforms does the indicator support?", a: "The Techin Momentum Indicator works across major charting platforms and adapts to forex, crypto, indices and stocks." },
    { q: "Do the courses expire?", a: "Never. Every course is a one-time purchase with lifetime access, including future updates to the material." },
    { q: "Is this financial advice?", a: "No. Everything here is educational. Trading carries risk and you are responsible for your own decisions." },
    { q: "Can I get a refund?", a: "Because these are instantly-delivered digital products, sales are final. Reach out if anything isn't working and we'll make it right." },
  ];
  return (
    <section id="faq" className="relative py-28 md:py-40 px-6 md:px-10">
      <div className="max-w-[1000px] mx-auto grid md:grid-cols-12 gap-10">
        <Reveal className="md:col-span-4">
          <p className="label mb-5">06 — FAQ</p>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl tracking-tighter leading-[0.95]">
            Questions,<br />answered.
          </h2>
        </Reveal>
        <div className="md:col-span-8">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-white/10" data-testid={`faq-item-${i}`}>
                <AccordionTrigger className="text-left font-display font-bold text-lg md:text-xl hover:text-[#E2FF4A] hover:no-underline py-6">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-zinc-400 leading-relaxed text-base pb-6">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ FINAL CTA */
function FinalCta() {
  const { buy, loadingId } = useBuy();
  return (
    <section className="relative py-28 md:py-40 px-6 md:px-10 grid-lines overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505]" />
      <Reveal className="relative max-w-[1400px] mx-auto text-center">
        <p className="label mb-6">Ready when you are</p>
        <h2 className="font-display font-black text-5xl md:text-8xl tracking-tighter leading-[0.9] mb-8">
          Trade with<br /><span className="text-[#E2FF4A]">conviction.</span>
        </h2>
        <p className="text-zinc-400 max-w-xl mx-auto mb-10 text-lg">
          Get the signature indicator, learn the method, and start seeing the market the way Raj does.
        </p>
        <button
          onClick={() => buy("indicator_pro")}
          disabled={loadingId === "indicator_pro"}
          className="inline-flex items-center gap-2 bg-[#E2FF4A] text-black font-medium px-8 py-4 rounded-full hover:bg-[#C8E631] hover:scale-[0.98] transition-transform duration-200 accent-glow"
          data-testid="final-cta-btn">
          Get the indicator — {INR(5499)} <ArrowUpRight size={18} />
        </button>
      </Reveal>
    </section>
  );
}
