"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth"

const installTabs = [
  { label: "macOS / Linux / WSL", code: `$ curl -fsSL https://claude.ai/install.sh | bash` },
  { label: "Windows (PowerShell)", code: `$ irm https://claude.ai/install.ps1 | iex` },
  { label: "brew",                 code: `$ brew install --cask claude-code` },
  { label: "npm",                  code: `$ npm install -g @anthropic-ai/claude-code` },
]

const pricing = [
  {
    label: "starter",
    price: "$2",
    tokens: "~200,000 tokens",
    desc: "Enough to try Claude Code properly. No subscription, no commitment.",
  },
  {
    label: "regular",
    price: "$8",
    tokens: "~1,000,000 tokens",
    desc: "A solid week of active coding. Top up whenever you need more.",
    highlight: true,
  },
  {
    label: "heavy",
    price: "$15",
    tokens: "~2,000,000 tokens",
    desc: "For power users and heavy sessions. Best value per token.",
  },
]

const faqs = [
  {
    q: "Is this against Anthropic's terms of service?",
    a: "Sharing account credentials violates Anthropic's ToS. Using this proxy means your requests go through someone else's account. That's a risk providers take knowingly. Users should be aware of this too.",
  },
  {
    q: "Why would anyone share their account?",
    a: "Claude Pro costs $20/month but most people only use it a few hours a day. The rest of the quota resets unused. Providers earn from time they're asleep or away from their desk.",
  },
  {
    q: "What stops someone from burning through my quota?",
    a: "Providers can set daily token caps and availability windows — e.g. only share quota between midnight and 8am in your timezone. You stay in control.",
  },
  {
    q: "How long do my credits last?",
    a: "They don't expire. Top up $2, use it over a week or a month — doesn't matter.",
  },
  {
    q: "What if all providers are busy or rate-limited?",
    a: "The proxy automatically switches to the next available provider. If none are available, the request fails. This is a best-effort pool, not a guaranteed SLA.",
  },
]

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const ready     = !isLoading
  const loggedIn  = ready && !!user
  const dashHref  = loggedIn ? "/dashboard" : "/login"
  const dashLabel = loggedIn ? "open dashboard →" : "get started →"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex flex-col mx-auto w-full max-w-5xl border-l border-r border-border">

        {/* Nav — sticky */}
        <nav className="sticky top-0 z-50 border-b border-border bg-background px-16 py-4 flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/logo-transparent.svg" alt="rel[ai]" className="h-11" />
          </Link>
          {ready && (
            <Link href={dashHref} className="text-base text-muted-foreground hover:text-foreground transition-colors">
              {dashLabel}
            </Link>
          )}
        </nav>

        {/* Hero */}
        <section className="border-b border-border px-16 pt-20 pb-20">
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight mb-7">
            Your Claude sits idle<br />
            <span className="text-primary">every night.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed mb-12 max-w-xl">
            You pay $20/month but Claude Code only runs when you do.
            The rest is wasted quota. This proxy lets others use your
            unused capacity while you sleep — and you earn from it.
            Or try Claude Code yourself for as little as $2, no subscription needed.
          </p>
          {ready && (
            <Link href={dashHref} className="inline-block bg-primary text-primary-foreground text-sm font-bold px-6 py-3 hover:opacity-90 transition-opacity">
              {dashLabel}
            </Link>
          )}
        </section>

        {/* Install */}
        <section className="border-b border-border px-16 py-16">
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">install claude code</p>
          <p className="text-muted-foreground text-base mb-8">That&apos;s the only tool you need. Install it once, point it at this proxy, and you&apos;re done.</p>
          <div className="border border-border">
            <div className="flex border-b border-border flex-wrap">
              {installTabs.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => setActiveTab(i)}
                  className={`px-5 py-3 text-sm transition-colors ${
                    activeTab === i
                      ? "text-foreground border-b-2 border-primary -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="px-6 py-5 text-sm text-muted-foreground font-mono">
              {installTabs[activeTab].code}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-border px-16 py-16">
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-10">how it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-border">
            {[
              {
                title: "passive income",
                desc: "Register your Claude account as a provider. When you're not coding, others route through it. You earn from quota you'd waste anyway.",
              },
              {
                title: "try for $2",
                desc: "No $20 subscription to test a new tool. Top up $2 in tokens, run Claude Code, see if it's worth it. Stop anytime.",
              },
              {
                title: "zero waste",
                desc: "Claude's hourly and weekly limits reset whether you use them or not. This proxy makes sure nothing goes to waste.",
              },
            ].map((f, i) => (
              <div key={f.title} className={`p-8 ${i < 2 ? "border-b sm:border-b-0 sm:border-r border-border" : ""}`}>
                <p className="text-primary text-xs tracking-widest uppercase mb-4">{f.title}</p>
                <p className="text-muted-foreground text-base leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="border-b border-border px-16 py-16">
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">pricing</p>
          <p className="text-muted-foreground text-base mb-10">One-time top-ups. No subscription, no expiry.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-border">
            {pricing.map((p, i) => (
              <div
                key={p.label}
                className={`p-8 flex flex-col gap-4 ${i < 2 ? "border-b sm:border-b-0 sm:border-r border-border" : ""} ${p.highlight ? "bg-card" : ""}`}
              >
                <p className="text-sm text-muted-foreground uppercase tracking-widest">{p.label}</p>
                <div>
                  <p className={`text-4xl font-bold ${p.highlight ? "text-primary" : ""}`}>{p.price}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.tokens}</p>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed flex-1">{p.desc}</p>
                {ready && (
                  <Link
                    href={dashHref}
                    className={`text-sm font-bold px-4 py-2.5 text-center transition-opacity hover:opacity-90 ${
                      p.highlight
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-foreground hover:border-primary"
                    }`}
                  >
                    get started →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section className="border-b border-border px-16 py-16">
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-6">built for privacy</p>
          <div className="flex gap-3">
            <span className="text-primary text-sm shrink-0">[+]</span>
            <p className="text-muted-foreground text-base leading-relaxed max-w-lg">
              We never store, log, or inspect your request content. Token counts are recorded for billing purposes only.
              Providers see only anonymized traffic — no prompts, no responses, no user data.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-border px-16 py-16">
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-8">faq</p>
          <div className="border border-border divide-y divide-border">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-base text-left hover:text-primary transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="text-muted-foreground ml-4 shrink-0">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-base text-muted-foreground leading-relaxed border-t border-border pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Footer links grid */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          {[
            { label: "GitHub", href: "https://github.com/xan5h33/claude-proxy-go" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Register", href: "/register" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="px-8 py-5 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Footer copyright */}
        <footer className="px-16 py-5 flex items-center justify-between text-xs text-muted-foreground">
          <span>©2026 proxy</span>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </footer>

      </div>
    </div>
  )
}
