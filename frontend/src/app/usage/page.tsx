"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { dashboard, UsageLog } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
        ? <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        : <div className="max-w-3xl mx-auto">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{totalInput.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Input tokens</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{totalOutput.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Output tokens</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Request Log</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No requests yet.</p>
            ) : (
              <div className="divide-y">
                {logs.map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>}
    </AppShell>
  )
}

function LogRow({ log }: { log: UsageLog }) {
  const total = log.input_tokens + log.output_tokens
  const date = new Date(log.created_at)

  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <div>
        <p className="text-xs text-muted-foreground">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-xs font-mono text-muted-foreground/60 truncate max-w-[180px]">{log.provider_id}</p>
      </div>
      <div className="flex items-center gap-2 text-right">
        <Badge variant="outline" className="text-xs font-mono">
          {log.input_tokens.toLocaleString()} in
        </Badge>
        <Badge variant="outline" className="text-xs font-mono">
          {log.output_tokens.toLocaleString()} out
        </Badge>
        <span className="text-xs font-medium w-20 text-right">{total.toLocaleString()} total</span>
      </div>
    </div>
  )
}
