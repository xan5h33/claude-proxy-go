"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { dashboard, Provider } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export default function DashboardPage() {
  const { user, isAdmin, isLoading, logout, setAuth } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [isLoading, user, router])

  if (isLoading || !user) return <div className="p-8">Loading...</div>

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => router.push("/")}>
                Admin Panel
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
          </div>
        </div>

        <div className="grid gap-6">
          <UsageCard user={user} />
          <APIKeyCard user={user} onRotate={(u) => setAuth(localStorage.getItem("token")!, u)} />
          <MyProvidersCard />
        </div>
      </div>
    </main>
  )
}

function UsageCard({ user }: { user: { balance: number; total_input_tokens: number; total_output_tokens: number } }) {
  const total = user.total_input_tokens + user.total_output_tokens
  const empty = user.balance <= 0

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
              {user.balance.toLocaleString()}
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

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono break-all">{value}</code>
        <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  )
}

function APIKeyCard({ user, onRotate }: { user: { api_key: string }; onRotate: (u: { api_key: string; balance: number; total_input_tokens: number; total_output_tokens: number; email: string; id: string; is_admin: boolean; created_at: string }) => void }) {
  const [rotating, setRotating] = useState(false)
  const [newKey, setNewKey] = useState("")

  const handleRotate = async () => {
    if (!confirm("Generate a new API key? The old key stops working immediately.")) return
    setRotating(true)
    setNewKey("")
    try {
      const updated = await dashboard.rotateKey()
      setNewKey(updated.api_key)
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
      <CardContent className="space-y-3">
        {newKey && (
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md space-y-1">
            <p className="text-xs font-medium text-green-700 dark:text-green-300">New key — copy it now:</p>
            <code className="text-xs font-mono break-all block">{newKey}</code>
          </div>
        )}
        <div className="space-y-3">
          <CopyBlock
            label="macOS / Linux"
            value={`ANTHROPIC_API_KEY=${user.api_key} ANTHROPIC_BASE_URL=https://claude-proxy-backend.fly.dev claude --bare`}
          />
          <CopyBlock
            label="Windows (PowerShell)"
            value={`$env:ANTHROPIC_API_KEY="${user.api_key}"; $env:ANTHROPIC_BASE_URL="https://claude-proxy-backend.fly.dev"; claude --bare`}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotating}>
          {rotating ? "Rotating..." : "Rotate Key"}
        </Button>
      </CardContent>
    </Card>
  )
}

function MyProvidersCard() {
  const { user } = useAuth()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setProviders(await dashboard.listProviders())
    } catch {
      // not a blocker
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">My Providers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/40 rounded-lg space-y-3">
          <p className="text-sm text-muted-foreground">
            Run this script on the machine you want to register as a provider.
          </p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">macOS / Linux</p>
            <div className="font-mono text-xs bg-background border rounded px-3 py-2 break-all select-all">
              ./register.sh {user?.api_key}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Windows (PowerShell)</p>
            <div className="font-mono text-xs bg-background border rounded px-3 py-2 break-all select-all">
              .\register.ps1 {user?.api_key}
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/register.sh" download="register.sh">
              <Button size="sm" variant="outline">Download .sh</Button>
            </a>
            <a href="/register.ps1" download="register.ps1">
              <Button size="sm" variant="outline">Download .ps1</Button>
            </a>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : providers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">No providers yet.</p>
        ) : (
          <div className="space-y-3">
            {providers.map((p) => (
              <ProviderRow key={p.id} provider={p} onUpdate={load} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProviderRow({ provider, onUpdate }: { provider: Provider; onUpdate: () => void }) {
  const [token, setToken] = useState("")
  const [saving, setSaving] = useState(false)

  const handleUpdateToken = async () => {
    if (!token.trim()) return
    setSaving(true)
    try {
      await dashboard.updateProviderTokens(provider.id, token.trim())
      setToken("")
      onUpdate()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    try {
      await dashboard.setProviderActive(provider.id, !provider.is_active)
      onUpdate()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed")
    }
  }

  const total = provider.total_input_tokens + provider.total_output_tokens

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{provider.name}</span>
          <Badge variant={provider.is_active ? "default" : "secondary"} className="text-xs">
            {provider.is_active ? "Active" : "Paused"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{total.toLocaleString()} tokens used</p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="New refresh token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="h-7 text-xs w-40"
          type="password"
        />
        <Button size="sm" variant="outline" onClick={handleUpdateToken} disabled={saving || !token.trim()} className="h-7 text-xs">
          Update
        </Button>
        <Button size="sm" variant="ghost" onClick={handleToggle} className="h-7 text-xs">
          {provider.is_active ? "Pause" : "Resume"}
        </Button>
      </div>
    </div>
  )
}
