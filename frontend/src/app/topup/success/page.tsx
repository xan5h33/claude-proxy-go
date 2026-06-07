"use client"

import Link from "next/link"
import { AppShell } from "@/components/app-shell"

export default function TopUpSuccessPage() {
  return (
    <AppShell>
      <div className="max-w-lg mx-auto border border-border p-8 space-y-4">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">payment complete</p>
        <p className="text-2xl font-bold text-primary">Tokens added.</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your balance has been credited. You can now use Claude Code through the proxy.
        </p>
        <Link
          href="/dashboard"
          className="inline-block text-sm font-bold px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          open dashboard →
        </Link>
      </div>
    </AppShell>
  )
}
