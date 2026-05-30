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

  const [topupAmount, setTopupAmount] = useState("")
  const [toppingUp, setToppingUp] = useState(false)
  const [topupMsg, setTopupMsg] = useState("")

  const [rotating, setRotating] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [copied, setCopied] = useState(false)

  const load = async () => {
    try {
      setUser(await api.users.get(id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleTopUp = async () => {
    if (!user || !topupAmount) return
    const amount = parseInt(topupAmount, 10)
    if (isNaN(amount) || amount <= 0) return
    setToppingUp(true)
    setTopupMsg("")
    try {
      const updated = await api.users.topUp(user.id, amount)
      setUser(updated)
      setTopupAmount("")
      setTopupMsg(`Added ${amount.toLocaleString()} tokens`)
      setTimeout(() => setTopupMsg(""), 3000)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed")
    } finally {
      setToppingUp(false)
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
  const empty = (user.balance ?? 0) <= 0

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
          <h1 className="text-2xl font-bold font-mono truncate">{user.email || user.api_key}</h1>
          {empty && <Badge variant="destructive">No Balance</Badge>}
        </div>

        <div className="grid gap-6">
          {/* Balance & Usage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Balance & Usage</CardTitle>
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

          {/* Top Up */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Up Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Add tokens to this user&apos;s balance.</p>
              <div className="space-y-1">
                <Label>Amount (tokens)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 1000000"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTopUp()}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleTopUp} disabled={toppingUp || !topupAmount}>
                  {toppingUp ? "Adding..." : "Add Tokens"}
                </Button>
                {topupMsg && <span className="text-sm text-green-600">{topupMsg}</span>}
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
