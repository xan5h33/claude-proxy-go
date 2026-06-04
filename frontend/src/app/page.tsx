"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth"

const tabs = [
  {
    label: "macOS / Linux",
    code: `$ ANTHROPIC_API_KEY=sk-proxy-xxxxxxxxxxxx \\
  ANTHROPIC_BASE_URL=https://claude-proxy-backend.fly.dev \\
  claude --bare`,
  },
  {
    label: "Windows",
    code: `$env:ANTHROPIC_API_KEY="sk-proxy-xxxxxxxxxxxx"
$env:ANTHROPIC_BASE_URL="https://claude-proxy-backend.fly.dev"
claude --bare`,
  },
]

const logLines = [
  { ok: true,  msg: "request routed to provider-1",    time: "11ms"  },
  { ok: true,  msg: "1,247 tokens consumed",           time: "0.01s" },
  { ok: true,  msg: "balance deducted: 1,247",         time: "0.00s" },
  { ok: true,  msg: "request routed to provider-3",    time: "8ms"   },
  { ok: false, msg: "rate limit detected, switching",  time: "0.00s" },
  { ok: true,  msg: "request routed to provider-2",    time: "14ms"  },
  { ok: true,  msg: "3,891 tokens consumed",           time: "0.01s" },
  { ok: true,  msg: "balance deducted: 3,891",         time: "0.00s" },
]

function CodeLine({ line }: { line: string }) {
  const highlight = (text: string, term: string, className: string) => {
    const parts = text.split(term)
    if (parts.length === 1) return null
    return (
      <div>
        {parts.map((p, i) => (
          <span key={i}>{p}{i < parts.length - 1 && <span className={className}>{term}</span>}</span>
        ))}
      </div>
    )
  }
  return (
    highlight(line, "sk-proxy-xxxxxxxxxxxx", "text-primary") ||
    highlight(line, "--bare", "text-primary") ||
    <div>{line}</div>
  )
}

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState(0)

  const ready     = !isLoading
  const loggedIn  = ready && !!user
  const dashHref  = loggedIn ? "/dashboard" : "/login"
  const dashLabel = loggedIn ? "open dashboard →" : "get started →"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Full-height column with sidelines */}
      <div className="flex-1 flex flex-col mx-auto w-full max-w-5xl border-l border-r border-border">

        {/* Nav */}
        <nav className="border-b border-border px-16 py-5 flex items-center justify-between">
          <Link href="/" className="text-primary text-base font-bold tracking-tight hover:opacity-80 transition-opacity">
            proxy
          </Link>
          {ready && (
            <Link href={dashHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {dashLabel}
            </Link>
          )}
        </nav>

        {/* Hero */}
        <section className="border-b border-border px-16 pt-20 pb-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-border px-3 py-1 text-xs text-muted-foreground mb-10">
            <span className="text-primary font-bold">new</span>
            Top up from $2. No monthly commitment.
            {ready && <Link href={dashHref} className="text-primary hover:opacity-75 transition-opacity">Try it</Link>}
          </div>

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
            <Link
              href={dashHref}
              className="inline-block bg-primary text-primary-foreground text-sm font-bold px-6 py-3 hover:opacity-90 transition-opacity"
            >
              {dashLabel}
            </Link>
          )}
        </section>

        {/* Code block */}
        <section className="border-b border-border px-16 py-16">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8">usage</p>
          <div className="border border-border">
            <div className="flex border-b border-border">
              {tabs.map((t, i) => (
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
            <div className="px-6 py-5 text-sm text-muted-foreground leading-7 whitespace-pre">
              {tabs[activeTab].code.split("\n").map((line, i) => (
                <CodeLine key={i} line={line} />
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-border px-16 py-16">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-10">how it works</p>
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
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Terminal log */}
        <section className="border-b border-border px-16 py-16">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8">live routing</p>
          <div className="border border-border px-6 py-2">
            {logLines.map((l, i) => (
              <div key={i} className="flex items-baseline justify-between text-sm py-2.5 border-b border-border last:border-0">
                <span>
                  <span className={l.ok ? "text-primary" : "text-destructive"}>{l.ok ? "✓" : "⚠"}</span>
                  <span className="text-muted-foreground ml-3">{l.msg}</span>
                </span>
                <span className="text-muted-foreground/60 text-xs ml-8 shrink-0">{l.time}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="px-16 py-5 text-xs text-muted-foreground">
          proxy — powered by claude
        </footer>

      </div>
    </div>
  )
}
