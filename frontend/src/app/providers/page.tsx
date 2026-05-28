"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, Provider } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async () => {
    try {
      setProviders(await api.providers.list())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Providers</h1>
            <p className="text-muted-foreground">{providers.length} registered</p>
          </div>
        </div>

        <div className="grid gap-4">
          {providers.length === 0 && (
            <p className="text-muted-foreground text-center py-12">
              No providers yet. Run <code className="bg-muted px-1 rounded">scripts/register.sh</code> on a provider machine.
            </p>
          )}
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} onUpdate={load} />
          ))}
        </div>
      </div>
    </main>
  )
}

function ProviderCard({ provider, onUpdate }: { provider: Provider; onUpdate: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isRateLimited = provider.rate_limited_until
    ? new Date(provider.rate_limited_until) > new Date()
    : false

  const windowLabel = provider.window_start_hour !== null && provider.window_end_hour !== null
    ? `${provider.window_start_hour}:00–${provider.window_end_hour}:00 ${provider.window_timezone}`
    : "always on"

  const handleUpdateToken = async () => {
    if (!token.trim()) return
    setSaving(true)
    try {
      await api.providers.updateRefreshToken(provider.id, token.trim())
      setOpen(false)
      setToken("")
      onUpdate()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete provider "${provider.name}"?`)) return
    setDeleting(true)
    try {
      await api.providers.delete(provider.id)
      onUpdate()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete")
      setDeleting(false)
    }
  }

  return (
    <Card className="cursor-default">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle
            className="text-lg hover:underline cursor-pointer"
            onClick={() => router.push(`/providers/${provider.id}`)}
          >
            {provider.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isRateLimited && <Badge variant="destructive">Rate Limited</Badge>}
            <Badge variant={provider.is_active ? "default" : "secondary"}>
              {provider.is_active ? "Active" : "Paused"}
            </Badge>
            <Badge variant="outline">
              {(provider.total_input_tokens + provider.total_output_tokens).toLocaleString()} tokens
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{provider.account_uuid}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span>Cap: {provider.cap === 0 ? "unlimited" : provider.cap.toLocaleString()}</span>
          <span>·</span>
          <span>Window: {windowLabel}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/providers/${provider.id}`)}>
            Manage
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button variant="outline" size="sm">Update Token</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Refresh Token — {provider.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>New Refresh Token</Label>
                  <Input
                    placeholder="sk-ant-oat01-..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    type="password"
                  />
                </div>
                <Button onClick={handleUpdateToken} disabled={saving || !token.trim()} className="w-full">
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
