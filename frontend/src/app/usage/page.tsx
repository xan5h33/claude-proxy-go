"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { dashboard, UsageLog } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
import { Spinner } from "@/components/spinner"

export default function UsagePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [isLoading, user, router])

  useEffect(() => {
    dashboard.getUsage()
      .then((data) => setLogs(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalInput = logs.reduce((s, l) => s + l.input_tokens, 0)
  const totalOutput = logs.reduce((s, l) => s + l.output_tokens, 0)

  return (
    <AppShell>
      {isLoading || !user
        ? <Spinner className="min-h-64" />
        : <div className="max-w-3xl mx-auto border border-border divide-y divide-border">

            {/* Summary */}
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: "requests",     value: logs.length },
                { label: "input tokens", value: totalInput },
                { label: "output tokens",value: totalOutput },
              ].map((s) => (
                <div key={s.label} className="px-6 py-5 text-center">
                  <p className="text-xl font-bold">{s.value.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Log */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground uppercase tracking-widest">request log</p>
              {loading ? (
                <Spinner className="py-6" />
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No requests yet.</p>
              ) : (
                <div className="border border-border divide-y divide-border">
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          </div>
      }
    </AppShell>
  )
}

function LogRow({ log }: { log: UsageLog }) {
  const total = log.input_tokens + log.output_tokens
  const date = new Date(log.created_at)

  return (
    <div className="flex items-center justify-between px-5 py-4 text-sm">
      <div className="space-y-1">
        <p className="text-muted-foreground">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-muted-foreground/50 font-mono truncate max-w-[200px] text-xs">{log.provider_id}</p>
      </div>
      <div className="flex items-center gap-5 text-right">
        <span className="text-muted-foreground">{log.input_tokens.toLocaleString()} in</span>
        <span className="text-muted-foreground">{log.output_tokens.toLocaleString()} out</span>
        <span className="text-foreground font-medium w-28 text-right">{total.toLocaleString()} total</span>
      </div>
    </div>
  )
}
