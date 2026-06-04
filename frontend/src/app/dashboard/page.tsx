"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { dashboard } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
        : <div className="max-w-2xl mx-auto grid gap-6">
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Balance & Usage</CardTitle>
          {empty && <Badge variant="destructive">No Balance</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-center mb-4">
          <div className="p-3 bg-muted/40 rounded-lg">
            <p className={`text-3xl font-bold ${empty ? "text-red-500" : "text-primary"}`}>
              {(user.balance ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Tokens remaining</p>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg">
            <p className="text-3xl font-bold">{total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Tokens used</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground">
          <div>{user.total_input_tokens.toLocaleString()} input</div>
          <div>{user.total_output_tokens.toLocaleString()} output</div>
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Proxy API Key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {newKey && (
          <p className="text-xs font-medium text-primary">New key generated — copy it now.</p>
        )}

        {/* Key */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">your key</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2 font-mono break-all">{key}</code>
            <Button variant="outline" size="sm" onClick={handleCopyKey} className="shrink-0">
              {copiedKey ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Usage command */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">run claude code with this proxy</p>
          <div className="border border-border">
            <div className="flex border-b border-border">
              {cmds.map((c, i) => (
                <button
                  key={c.label}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2 text-xs transition-colors ${
                    activeTab === i ? "text-foreground border-b border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex items-start gap-2 px-4 py-3">
              <code className="flex-1 text-xs text-muted-foreground font-mono break-all leading-relaxed">{cmds[activeTab].value}</code>
              <Button variant="outline" size="sm" onClick={handleCopyCmd} className="shrink-0 mt-0.5">
                {copiedCmd ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotating}>
          {rotating ? "Rotating..." : "Rotate Key"}
        </Button>
      </CardContent>
    </Card>
  )
}

