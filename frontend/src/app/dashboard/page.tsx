"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth"
import { dashboard } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
import { Spinner } from "@/components/spinner"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const { user, isLoading, setAuth } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [isLoading, user, router])

  return (
    <AppShell>
      {isLoading || !user
        ? <Spinner className="min-h-64" />
        : <div className="max-w-2xl mx-auto border border-border divide-y divide-border">
            <UsageCard user={user} />
            <APIKeyCard user={user} onRotate={(u) => setAuth(localStorage.getItem("token")!, u)} />
          </div>
      }
    </AppShell>
  )
}

const LOW_BALANCE_THRESHOLD = 20_000

function UsageCard({ user }: { user: { balance?: number; total_input_tokens: number; total_output_tokens: number } }) {
  const total = user.total_input_tokens + user.total_output_tokens
  const balance = user.balance ?? 0
  const empty = balance <= 0
  const low = !empty && balance < LOW_BALANCE_THRESHOLD

  return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-muted-foreground uppercase tracking-widest">balance & usage</p>
      <div className="grid grid-cols-2 gap-0 border border-border divide-x divide-border">
        <div className="px-6 py-5 text-center">
          <p className={`text-2xl font-bold ${empty ? "text-destructive" : low ? "text-amber-500" : "text-primary"}`}>
            {balance.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">tokens remaining</p>
        </div>
        <div className="px-6 py-5 text-center">
          <p className="text-2xl font-bold">{total.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">tokens used</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground">
        <div>{user.total_input_tokens.toLocaleString()} input</div>
        <div>{user.total_output_tokens.toLocaleString()} output</div>
      </div>
      {empty && (
        <div className="flex items-center justify-between px-4 py-3 bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">Balance empty — requests are blocked.</p>
          <Link href="/topup" className="text-sm font-bold text-destructive hover:opacity-80 shrink-0 ml-4">
            Top up →
          </Link>
        </div>
      )}
      {low && (
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300">Running low on tokens.</p>
          <Link href="/topup" className="text-sm font-bold text-amber-700 dark:text-amber-300 hover:opacity-80 shrink-0 ml-4">
            Top up →
          </Link>
        </div>
      )}
    </div>
  )
}

function APIKeyCard({ user, onRotate }: { user: { api_key: string }; onRotate: (u: import("@/lib/api").User) => void }) {
  const [rotating, setRotating] = useState(false)
  const [newKey, setNewKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [copiedCmd, setCopiedCmd] = useState(false)

  const key = user.api_key

  const cmds = [
    {
      label: "macOS / Linux",
      value: `ANTHROPIC_API_KEY=${key} ANTHROPIC_BASE_URL=https://claude-proxy-backend.fly.dev claude --bare`,
    },
    {
      label: "Windows",
      value: `$env:ANTHROPIC_API_KEY="${key}"; $env:ANTHROPIC_BASE_URL="https://claude-proxy-backend.fly.dev"; claude --bare`,
    },
  ]

  const handleCopyKey = () => {
    navigator.clipboard.writeText(key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(cmds[activeTab].value)
    setCopiedCmd(true)
    setTimeout(() => setCopiedCmd(false), 2000)
  }

  const handleRotate = async () => {
    if (!confirm("Generate a new API key? The old key stops working immediately.")) return
    setRotating(true)
    setNewKey(false)
    try {
      const updated = await dashboard.rotateKey()
      setNewKey(true)
      onRotate(updated)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed")
    } finally {
      setRotating(false)
    }
  }

  return (
    <div className="p-6 space-y-5">
      <p className="text-sm text-muted-foreground uppercase tracking-widest">proxy api key</p>

      {newKey && <p className="text-sm text-primary">New key generated — copy it now.</p>}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">your key</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-muted px-3 py-2.5 font-mono break-all border border-border">{key}</code>
          <Button variant="outline" size="sm" onClick={handleCopyKey} className="shrink-0">
            {copiedKey ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">run claude code with this proxy</p>
        <div className="border border-border">
          <div className="flex border-b border-border">
            {cmds.map((c, i) => (
              <button
                key={c.label}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 text-sm transition-colors ${
                  activeTab === i ? "text-foreground border-b border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-start gap-3 px-4 py-4">
            <code className="flex-1 text-sm text-muted-foreground font-mono break-all leading-relaxed">{cmds[activeTab].value}</code>
            <Button variant="outline" size="sm" onClick={handleCopyCmd} className="shrink-0">
              {copiedCmd ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotating}>
        {rotating ? "Rotating..." : "Rotate Key"}
      </Button>
    </div>
  )
}
