"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { dashboard } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
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
        ? <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        : <div className="max-w-2xl mx-auto border border-border divide-y divide-border">
            <UsageCard user={user} />
            <APIKeyCard user={user} onRotate={(u) => setAuth(localStorage.getItem("token")!, u)} />
          </div>
      }
    </AppShell>
  )
}

function UsageCard({ user }: { user: { balance?: number; total_input_tokens: number; total_output_tokens: number } }) {
  const total = user.total_input_tokens + user.total_output_tokens
  const empty = (user.balance ?? 0) <= 0

  return (
    <div className="p-8 space-y-5">
      <p className="text-sm text-muted-foreground uppercase tracking-widest">balance & usage</p>
      <div className="grid grid-cols-2 gap-0 border border-border divide-x divide-border">
        <div className="px-8 py-6 text-center">
          <p className={`text-4xl font-bold ${empty ? "text-destructive" : "text-primary"}`}>
            {(user.balance ?? 0).toLocaleString()}
          </p>
          <p className="text-base text-muted-foreground mt-2">tokens remaining</p>
        </div>
        <div className="px-8 py-6 text-center">
          <p className="text-4xl font-bold">{total.toLocaleString()}</p>
          <p className="text-base text-muted-foreground mt-2">tokens used</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground">
        <div>{user.total_input_tokens.toLocaleString()} input</div>
        <div>{user.total_output_tokens.toLocaleString()} output</div>
      </div>
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
    <div className="p-8 space-y-6">
      <p className="text-sm text-muted-foreground uppercase tracking-widest">proxy api key</p>

      {newKey && <p className="text-base text-primary">New key generated — copy it now.</p>}

      <div className="space-y-3">
        <p className="text-base text-muted-foreground">your key</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 text-sm bg-muted px-4 py-3 font-mono break-all border border-border">{key}</code>
          <Button variant="outline" size="sm" onClick={handleCopyKey} className="shrink-0 h-9 px-4 text-sm">
            {copiedKey ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-base text-muted-foreground">run claude code with this proxy</p>
        <div className="border border-border">
          <div className="flex border-b border-border">
            {cmds.map((c, i) => (
              <button
                key={c.label}
                onClick={() => setActiveTab(i)}
                className={`px-5 py-3 text-sm transition-colors ${
                  activeTab === i ? "text-foreground border-b border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-start gap-3 px-5 py-5">
            <code className="flex-1 text-sm text-muted-foreground font-mono break-all leading-relaxed">{cmds[activeTab].value}</code>
            <Button variant="outline" size="sm" onClick={handleCopyCmd} className="shrink-0 h-9 px-4 text-sm">
              {copiedCmd ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotating} className="h-9 px-5 text-sm">
        {rotating ? "Rotating..." : "Rotate Key"}
      </Button>
    </div>
  )
}
