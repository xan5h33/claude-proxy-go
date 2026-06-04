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
  const [newKey, setNewKey] = useState("")
  const [copied, setCopied] = useState(false)

  const displayKey = newKey || user.api_key

  const handleCopy = () => {
    navigator.clipboard.writeText(displayKey)
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
        {newKey && (
          <p className="text-xs font-medium text-green-700 dark:text-green-300">New key generated — copy it now.</p>
        )}
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono break-all">{displayKey}</code>
          <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotating}>
          {rotating ? "Rotating..." : "Rotate Key"}
        </Button>
      </CardContent>
    </Card>
  )
}

