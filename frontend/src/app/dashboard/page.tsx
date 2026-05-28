"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { dashboard, Provider } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

function UsageCard({ user }: { user: { cap: number; total_input_tokens: number; total_output_tokens: number } }) {
  const total = user.total_input_tokens + user.total_output_tokens
  const overCap = user.cap > 0 && total >= user.cap

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Token Usage</CardTitle>
          {overCap && <Badge variant="destructive">Cap Exceeded</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div>
            <p className="text-2xl font-bold">{user.total_input_tokens.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Input</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{user.total_output_tokens.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Output</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
        {user.cap > 0 && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{total.toLocaleString()} used</span>
              <span>{user.cap.toLocaleString()} cap</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overCap ? "bg-red-500" : "bg-primary"}`}
                style={{ width: `${Math.min(100, (total / user.cap) * 100)}%` }}
              />
            </div>
          </div>
        )}
        <CapEditor cap={user.cap} />
      </CardContent>
    </Card>
  )
}

function CapEditor({ cap }: { cap: number }) {
  const [value, setValue] = useState(cap === 0 ? "" : String(cap))
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const handleSave = async () => {
    setSaving(true)
    setMsg("")
    try {
      await dashboard.updateCap(value === "" ? 0 : parseInt(value, 10))
      setMsg("Saved")
      setTimeout(() => setMsg(""), 2000)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t space-y-2">
      <Label className="text-xs">Token cap (0 = unlimited)</Label>
      <div className="flex gap-2">
        <Input
          type="number"
          min="0"
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "..." : "Save"}
        </Button>
        {msg && <span className="text-xs text-green-600 self-center">{msg}</span>}
      </div>
    </div>
  )
}

function APIKeyCard({ user, onRotate }: { user: { api_key: string }; onRotate: (u: { api_key: string; cap: number; total_input_tokens: number; total_output_tokens: number; email: string; id: string; is_admin: boolean; created_at: string }) => void }) {
  const [copied, setCopied] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [newKey, setNewKey] = useState("")

  const handleCopy = () => {
    navigator.clipboard.writeText(user.api_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
        <p className="text-xs text-muted-foreground">
          Use this as <code className="bg-muted px-1 rounded">ANTHROPIC_API_KEY</code> in Claude Code.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">{user.api_key}</code>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        {newKey && (
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md space-y-1">
            <p className="text-xs font-medium text-green-700 dark:text-green-300">New key — copy it now:</p>
            <code className="text-xs font-mono break-all block">{newKey}</code>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotating}>
          {rotating ? "Rotating..." : "Rotate Key"}
        </Button>
      </CardContent>
    </Card>
  )
}

function MyProvidersCard() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">My Providers</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancel" : "+ Add Provider"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showAdd && <AddProviderForm onAdd={() => { setShowAdd(false); load() }} />}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : providers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No providers yet. Add your Claude Code OAuth tokens to contribute to the pool.
          </p>
        ) : (
          <div className="space-y-3 mt-2">
            {providers.map((p) => (
              <ProviderRow key={p.id} provider={p} onUpdate={load} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AddProviderForm({ onAdd }: { onAdd: () => void }) {
  const [name, setName] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [accountUUID, setAccountUUID] = useState("")
  const [deviceID, setDeviceID] = useState("")
  const [billing, setBilling] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await dashboard.registerProvider({
        name, refresh_token: refreshToken, access_token: accessToken,
        account_uuid: accountUUID, device_id: deviceID, billing,
      })
      onAdd()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mb-4 p-4 bg-muted/40 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input placeholder="My Account" value={name} onChange={(e) => setName(e.target.value)} required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Account UUID</Label>
          <Input placeholder="uuid" value={accountUUID} onChange={(e) => setAccountUUID(e.target.value)} required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Refresh Token</Label>
          <Input type="password" placeholder="sk-ant-oat01-..." value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Access Token (optional)</Label>
          <Input type="password" placeholder="sk-ant-..." value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Device ID</Label>
          <Input placeholder="device-uuid" value={deviceID} onChange={(e) => setDeviceID(e.target.value)} required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Billing</Label>
          <Input placeholder="billing string" value={billing} onChange={(e) => setBilling(e.target.value)} required className="h-8 text-sm" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? "Adding..." : "Add Provider"}
      </Button>
    </form>
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
