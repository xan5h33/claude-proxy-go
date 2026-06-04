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
  { ok: true,  msg: "request routed to provider-1",       time: "11ms"   },
  { ok: true,  msg: "1,247 tokens consumed",              time: "0.01s"  },
  { ok: true,  msg: "balance deducted: 1,247",            time: "0.00s"  },
  { ok: true,  msg: "request routed to provider-3",       time: "8ms"    },
  { ok: false, msg: "rate limit detected, switching",     time: "0.00s"  },
  { ok: true,  msg: "request routed to provider-2",       time: "14ms"   },
  { ok: true,  msg: "3,891 tokens consumed",              time: "0.01s"  },
  { ok: true,  msg: "balance deducted: 3,891",            time: "0.00s"  },
]

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState(0)

  const dashHref = !isLoading && user ? "/dashboard" : "/login"
  const dashLabel = !isLoading && user ? "open dashboard →" : "sign in →"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 sm:px-12 py-4 flex items-center justify-between">
        <span className="text-primary text-lg font-bold tracking-tight">proxy</span>
        <Link
          href={dashHref}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {dashLabel}
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 px-6 sm:px-12 pt-16 pb-0 max-w-4xl">
        {/* Badge */}
        <div className="inline-flex items-center border border-border px-2 py-0.5 text-xs text-muted-foreground mb-10">
          <span className="text-primary mr-2">new</span>
          Balance top-up available in dashboard.{" "}
          <Link href={dashHref} className="text-primary ml-1 hover:opacity-80">Get started</Link>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] mb-6">
          Share Claude Code<br />
          <span className="text-primary">across your team.</span>
        </h1>

        {/* Subtext */}
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-10 max-w-xl">
          Pool multiple Claude accounts behind a single<br className="hidden sm:block" />
          API endpoint. One key, shared token balance,<br className="hidden sm:block" />
          automatic failover.
        </p>

        {/* CTA */}
        <Link
          href={dashHref}
          className="inline-block bg-primary text-primary-foreground text-sm font-bold px-5 py-3 hover:opacity-90 transition-opacity mb-16"
        >
          {dashLabel}
        </Link>

        {/* Tabbed code block */}
        <div className="border border-border max-w-2xl mb-0">
          {/* Tab bar */}
          <div className="flex border-b border-border">
            {tabs.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 text-sm transition-colors ${
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
          <div className="px-5 py-4 text-sm text-muted-foreground leading-relaxed whitespace-pre">
            {tabs[activeTab].code.split("\n").map((line, i) => (
              <div key={i}>
                {line.includes("sk-proxy") ? (
                  <>
                    {line.split("sk-proxy-xxxxxxxxxxxx").map((part, j, arr) => (
                      <span key={j}>
                        {part}
                        {j < arr.length - 1 && (
                          <span className="text-primary">sk-proxy-xxxxxxxxxxxx</span>
                        )}
                      </span>
                    ))}
                  </>
                ) : line.includes("--bare") ? (
                  <>
                    {line.split("--bare").map((part, j, arr) => (
                      <span key={j}>
                        {part}
                        {j < arr.length - 1 && (
                          <span className="text-primary">--bare</span>
                        )}
                      </span>
                    ))}
                  </>
                ) : (
                  line
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Terminal output section */}
      <div className="mt-16 border-t border-border bg-card px-6 sm:px-12 py-8">
        <div className="max-w-4xl">
          {logLines.map((l, i) => (
            <div key={i} className="flex items-baseline justify-between py-1 text-sm">
              <span className={l.ok ? "text-primary" : "text-destructive"}>
                {l.ok ? "✓" : "⚠"}{" "}
                <span className="text-muted-foreground">{l.msg}</span>
              </span>
              <span className="text-muted-foreground/50 text-xs ml-8 shrink-0">{l.time}</span>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-border px-6 sm:px-12 py-4 text-xs text-muted-foreground">
        proxy — powered by claude
      </footer>
    </div>
  )
}
