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
  if (line.includes("sk-proxy-xxxxxxxxxxxx")) {
    const parts = line.split("sk-proxy-xxxxxxxxxxxx")
    return (
      <div>
        {parts[0]}<span className="text-primary">sk-proxy-xxxxxxxxxxxx</span>{parts[1]}
      </div>
    )
  }
  if (line.includes("--bare")) {
    const parts = line.split("--bare")
    return (
      <div>
        {parts[0]}<span className="text-primary">--bare</span>{parts[1]}
      </div>
    )
  }
  return <div>{line}</div>
}

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState(0)

  const dashHref  = !isLoading && user ? "/dashboard" : "/login"
  const dashLabel = !isLoading && user ? "open dashboard →" : "sign in →"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-primary text-base font-bold tracking-tight hover:opacity-80 transition-opacity">proxy</Link>
          <Link href={dashHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {dashLabel}
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6">

          {/* Hero */}
          <div className="pt-24 pb-16 border-b border-border">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 border border-border px-3 py-1 text-xs text-muted-foreground mb-10">
              <span className="text-primary font-bold">new</span>
              Balance top-up available in dashboard.
              <Link href={dashHref} className="text-primary hover:opacity-75 transition-opacity">
                Get started
              </Link>
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
              Share Claude Code<br />
              <span className="text-primary">across your team.</span>
            </h1>

            {/* Sub */}
            <p className="text-muted-foreground text-lg leading-relaxed mb-12 max-w-lg">
              Pool multiple Claude accounts behind a single API endpoint.
              One key, shared token balance, automatic failover.
            </p>

            {/* CTA */}
            <Link
              href={dashHref}
              className="inline-block bg-primary text-primary-foreground text-sm font-bold px-6 py-3 hover:opacity-90 transition-opacity"
            >
              {dashLabel}
            </Link>
          </div>

          {/* Code block */}
          <div className="py-16 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">usage</p>
            <div className="border border-border">
              {/* Tabs */}
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
              {/* Code */}
              <div className="px-6 py-5 text-sm text-muted-foreground leading-7 whitespace-pre">
                {tabs[activeTab].code.split("\n").map((line, i) => (
                  <CodeLine key={i} line={line} />
                ))}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="py-16 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-10">how it works</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-border">
              {[
                {
                  title: "account pooling",
                  desc: "Register multiple Claude accounts as providers. Requests route automatically to available ones.",
                },
                {
                  title: "token balance",
                  desc: "Pre-purchase credits. Usage tracked per request, per user. No surprises.",
                },
                {
                  title: "drop-in replace",
                  desc: "Set two env vars. Nothing else in your workflow changes.",
                },
              ].map((f, i) => (
                <div key={f.title} className={`p-8 ${i < 2 ? "sm:border-r border-b sm:border-b-0 border-border" : ""}`}>
                  <p className="text-primary text-xs tracking-widest uppercase mb-4">{f.title}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal log */}
          <div className="py-16">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">live routing</p>
            <div className="border border-border px-6 py-5 space-y-1">
              {logLines.map((l, i) => (
                <div key={i} className="flex items-baseline justify-between text-sm py-0.5">
                  <span>
                    <span className={l.ok ? "text-primary" : "text-destructive"}>{l.ok ? "✓" : "⚠"}</span>
                    <span className="text-muted-foreground ml-3">{l.msg}</span>
                  </span>
                  <span className="text-muted-foreground/40 text-xs ml-8 shrink-0">{l.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-5 text-xs text-muted-foreground">
          proxy — powered by claude
        </div>
      </footer>

    </div>
  )
}
