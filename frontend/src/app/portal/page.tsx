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
  onKeyRotated,
}: {
  user: User
  apiKey: string
  onKeyRotated: (newKey: string) => void
}) {
  const [rotating, setRotating] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [copied, setCopied] = useState(false)

  const total = user.total_input_tokens + user.total_output_tokens
  const empty = user.balance <= 0

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
      {/* Balance & Usage */}
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
