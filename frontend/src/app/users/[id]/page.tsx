"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api, User } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [cap, setCap] = useState("")
  const [savingCap, setSavingCap] = useState(false)
  const [capMsg, setCapMsg] = useState("")

  const [rotating, setRotating] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [copied, setCopied] = useState(false)

  const load = async () => {
    try {
      const u = await api.users.get(id)
      setUser(u)
      setCap(u.cap === 0 ? "" : String(u.cap))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleSaveCap = async () => {
    if (!user) return
    setSavingCap(true)
    setCapMsg("")
    try {
      await api.users.updateCap(user.id, cap === "" ? 0 : parseInt(cap, 10))
      setCapMsg("Saved")
      await load()
      setTimeout(() => setCapMsg(""), 2000)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSavingCap(false)
    }
  }

  const handleRotateKey = async () => {
    if (!user) return
    if (!confirm("Generate a new API key? The old key will stop working immediately.")) return
    setRotating(true)
    setNewKey("")
    try {
      const updated = await api.users.rotateKey(user.id)
      setNewKey(updated.api_key)
      await load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to rotate key")
    } finally {
      setRotating(false)
    }
  }

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!user) return null

  const total = user.total_input_tokens + user.total_output_tokens
  const overCap = user.cap > 0 && total >= user.cap

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/users")}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1"
        >
          ← Users
        </button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold font-mono">{user.api_key}</h1>
          {overCap && <Badge variant="destructive">Cap Exceeded</Badge>}
        </div>

        <div className="grid gap-6">
          {/* Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Token Usage</CardTitle>
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
                  {savingCap ? "Saving..." : "Save"}
                </Button>
                {capMsg && <span className="text-sm text-green-600">{capMsg}</span>}
              </div>
            </CardContent>
          </Card>

          {/* API Key */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">{user.api_key}</code>
                <Button variant="outline" size="sm" onClick={() => handleCopy(user.api_key)}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>

              {newKey && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md space-y-2">
                  <p className="text-xs font-medium text-green-700 dark:text-green-300">New key generated — copy it now:</p>
                  <code className="text-xs font-mono break-all block">{newKey}</code>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(newKey)}>Copy New Key</Button>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Rotating generates a new key. The old key stops working immediately.
                </p>
                <Button variant="outline" onClick={handleRotateKey} disabled={rotating}>
                  {rotating ? "Rotating..." : "Rotate API Key"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
