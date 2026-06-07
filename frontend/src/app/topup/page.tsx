"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth"
import { dashboard } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
import { Spinner } from "@/components/spinner"

const tiers = [
  {
    key: "starter",
    label: "starter",
    price: "$2",
    tokens: "200,000 tokens",
    desc: "Enough to try Claude Code properly. No subscription, no commitment.",
  },
  {
    key: "regular",
    label: "regular",
    price: "$8",
    tokens: "1,000,000 tokens",
    desc: "A solid week of active coding. Top up whenever you need more.",
    highlight: true,
  },
  {
    key: "heavy",
    label: "heavy",
    price: "$15",
    tokens: "2,000,000 tokens",
    desc: "For power users and heavy sessions. Best value per token.",
  },
]

export default function TopUpPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState("")

  const handleSelect = async (tierKey: string) => {
    setError("")
    setLoading(tierKey)
    try {
      const { url } = await dashboard.createCheckout(tierKey)
      window.location.href = url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setLoading(null)
    }
  }

  return (
    <AppShell>
      {isLoading || !user ? (
        <Spinner className="min-h-64" />
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">top up</p>
            <p className="text-muted-foreground text-sm">One-time purchase. No subscription, no expiry.</p>
          </div>

          {error && (
            <p className="text-sm text-destructive mb-6">{error}</p>
          )}

          <div className="border border-border divide-y divide-border">
            {tiers.map((tier) => (
              <div
                key={tier.key}
                className={`flex items-center justify-between px-6 py-5 gap-6 ${tier.highlight ? "bg-card" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{tier.label}</p>
                  <p className={`text-2xl font-bold mb-0.5 ${tier.highlight ? "text-primary" : ""}`}>{tier.price}</p>
                  <p className="text-sm text-muted-foreground mb-2">{tier.tokens}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tier.desc}</p>
                </div>
                <button
                  onClick={() => handleSelect(tier.key)}
                  disabled={loading !== null}
                  className={`shrink-0 text-sm font-bold px-5 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${
                    tier.highlight
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:border-primary"
                  }`}
                >
                  {loading === tier.key ? <Spinner className="w-16" /> : "buy →"}
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Payments are processed securely by Polar. Tokens are credited instantly after payment.
          </p>
        </div>
      )}
    </AppShell>
  )
}
