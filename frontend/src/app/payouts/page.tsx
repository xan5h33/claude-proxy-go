"use client"

import { useEffect, useState } from "react"
import { adminApi, PayoutRequest } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
import { Spinner } from "@/components/spinner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setPayouts(await adminApi.payouts.list())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const pending = payouts.filter(p => p.status === "pending")
  const rest = payouts.filter(p => p.status !== "pending")

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">payouts</p>
          <p className="text-sm text-muted-foreground">{pending.length} pending</p>
        </div>

        {loading ? (
          <Spinner className="min-h-64" />
        ) : payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No payout requests yet.</p>
        ) : (
          <div className="space-y-8">
            {pending.length > 0 && (
              <section>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Pending</p>
                <div className="border border-border divide-y divide-border">
                  {pending.map(p => (
                    <PayoutRow key={p.id} payout={p} onUpdate={load} />
                  ))}
                </div>
              </section>
            )}
            {rest.length > 0 && (
              <section>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">History</p>
                <div className="border border-border divide-y divide-border">
                  {rest.map(p => (
                    <PayoutRow key={p.id} payout={p} onUpdate={load} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function PayoutRow({ payout, onUpdate }: { payout: PayoutRequest; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState("")

  const handle = async (status: "approved" | "rejected") => {
    setLoading(true)
    try {
      await adminApi.payouts.update(payout.id, status, note)
      onUpdate()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed")
      setLoading(false)
    }
  }

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-mono text-muted-foreground truncate">{payout.provider_id}</p>
          <p className="text-sm text-muted-foreground">{new Date(payout.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-lg font-bold">${payout.amount.toFixed(4)}</span>
          <Badge variant={payout.status === "approved" ? "default" : payout.status === "rejected" ? "destructive" : "secondary"}>
            {payout.status}
          </Badge>
        </div>
      </div>
      {payout.note && (
        <p className="text-xs text-muted-foreground">{payout.note}</p>
      )}
      {payout.status === "pending" && (
        <div className="flex items-center gap-2">
          <input
            className="flex-1 h-8 px-3 text-sm border border-input bg-background rounded-md"
            placeholder="Note (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <Button size="sm" onClick={() => handle("approved")} disabled={loading}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => handle("rejected")} disabled={loading}>
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}
