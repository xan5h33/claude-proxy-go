"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth"

export default function HomePage() {
  const { user, isLoading } = useAuth()

  const ctaHref = !isLoading && user ? "/dashboard" : "/login"
  const ctaLabel = !isLoading && user ? "Open dashboard →" : "Sign in →"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="text-primary font-mono font-bold tracking-tight">proxy</span>
        <Link
          href={ctaHref}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {ctaLabel}
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <p className="text-xs text-primary tracking-widest uppercase mb-6">claude code proxy</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6 text-foreground">
            Run Claude Code<br />
            <span className="text-primary">without limits.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            Pool multiple Claude accounts behind a single endpoint.
            One API key. Shared token balance. No more juggling accounts.
          </p>
          <Link
            href={ctaHref}
            className="inline-block px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {ctaLabel}
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mt-24 w-full max-w-3xl border border-border">
          {[
            {
              title: "account pooling",
              desc: "Register multiple Claude accounts as providers. Requests route automatically.",
            },
            {
              title: "token balance",
              desc: "Pre-purchase token credits. Usage is tracked per request, per user.",
            },
            {
              title: "drop-in replace",
              desc: "Set ANTHROPIC_BASE_URL and your proxy key. Nothing else changes.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-card p-6 text-left">
              <p className="text-primary text-xs tracking-widest uppercase mb-3">{f.title}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Code snippet */}
        <div className="mt-12 w-full max-w-xl text-left">
          <p className="text-xs text-muted-foreground mb-2">usage</p>
          <div className="bg-card border border-border p-4 text-sm">
            <p className="text-muted-foreground"><span className="text-primary">$</span> ANTHROPIC_API_KEY=<span className="text-foreground">sk-proxy-...</span> \</p>
            <p className="text-muted-foreground pl-4">ANTHROPIC_BASE_URL=<span className="text-foreground">https://claude-proxy-backend.fly.dev</span> \</p>
            <p className="text-muted-foreground pl-4">claude <span className="text-primary">--bare</span></p>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-border text-xs text-muted-foreground text-center">
        proxy — powered by claude
      </footer>
    </div>
  )
}
