"use client"

import { useState } from "react"
import { me, User } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PortalPage() {
  const [apiKey, setApiKey] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLoad = async () => {
    if (!apiKey.trim()) return
    setLoading(true)
    setError("")
    try {
      setUser(await me.get(apiKey.trim()))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">User Portal</h1>
          <p className="text-muted-foreground">Enter your API key to manage your account.</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-3">
            <div className="space-y-1">
              <Label>Your API Key</Label>
              <Input
                placeholder="sk-proxy-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoad()}
                type="password"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleLoad} disabled={loading || !apiKey.trim()} className="w-full">
              {loading ? "Loading..." : "Load Account"}
            </Button>
          </CardContent>
        </Card>

        {user && (
          <UserDashboard
            user={user}
            apiKey={apiKey}
            onRefresh={async () => setUser(await me.get(apiKey))}
            onKeyRotated={(newKey) => {
              setApiKey(newKey)
              me.get(newKey).then(setUser)
            }}
          />
        )}
      </div>
    </main>
  )
}

function UserDashboard({
  user,
  apiKey,
  onRefresh,
  onKeyRotated,
}: {
  user: User
  apiKey: string
  onRefresh: () => Promise<void>
  onKeyRotated: (newKey: string) => void
}) {
  const [cap, setCap] = useState(user.cap === 0 ? "" : String(user.cap))
  const [savingCap, setSavingCap] = useState(false)
  const [capMsg, setCapMsg] = useState("")
  const [rotating, setRotating] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [copied, setCopied] = useState(false)

  const total = user.total_input_tokens + user.total_output_tokens
  const overCap = user.cap > 0 && total >= user.cap

  const handleSaveCap = async () => {
    setSavingCap(true)
    setCapMsg("")
    try {
      await me.updateCap(apiKey, cap === "" ? 0 : parseInt(cap, 10))
      setCapMsg("Saved")
      await onRefresh()
      setTimeout(() => setCapMsg(""), 2000)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSavingCap(false)
    }
  }

  const handleRotate = async () => {
    if (!confirm("Generate a new API key? The old key will stop working immediately.")) return
    setRotating(true)
    setNewKey("")
    try {
      const updated = await me.rotateKey(apiKey)
      setNewKey(updated.api_key)
      onKeyRotated(updated.api_key)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to rotate key")
    } finally {
      setRotating(false)
    }
  }

  const copy = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid gap-6">
      {/* Stats */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Token Usage</CardTitle>
            {overCap && <Badge variant="destructive">Cap Exceeded</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
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
            <div className="mt-4">
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
        </CardContent>
      </Card>

      {/* Cap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Token Cap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Max tokens (0 = unlimited)</Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveCap} disabled={savingCap}>
              {savingCap ? "Saving..." : "Save Cap"}
            </Button>
            {capMsg && <span className="text-sm text-green-600">{capMsg}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Key rotation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">{apiKey}</code>
            <Button variant="outline" size="sm" onClick={() => copy(apiKey)}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          {newKey && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md space-y-2">
              <p className="text-xs font-medium text-green-700 dark:text-green-300">New key generated — copy it now, the old one is gone:</p>
              <code className="text-xs font-mono break-all block">{newKey}</code>
              <Button variant="outline" size="sm" onClick={() => copy(newKey)}>Copy New Key</Button>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Rotating generates a new key. The old key stops working immediately.
            </p>
            <Button variant="outline" onClick={handleRotate} disabled={rotating}>
              {rotating ? "Rotating..." : "Rotate API Key"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
