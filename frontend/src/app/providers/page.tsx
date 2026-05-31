"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, Provider } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <p className="text-muted-foreground mb-6">{providers.length} registered</p>

        <div className="grid gap-4">
          {providers.length === 0 && (
            <p className="text-muted-foreground text-center py-12">
              No providers yet.
            </p>
          )}
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} onUpdate={load} />
          ))}
        </div>
      </div>
    </AppShell>
  )
}

function ProviderCard({ provider, onUpdate }: { provider: Provider; onUpdate: () => void }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const isRateLimited = provider.rate_limited_until
    ? new Date(provider.rate_limited_until) > new Date()
    : false

  const windowLabel = provider.window_start_hour !== null && provider.window_end_hour !== null
    ? `${provider.window_start_hour}:00–${provider.window_end_hour}:00 ${provider.window_timezone}`
    : "always on"

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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle
            className="text-sm hover:underline cursor-pointer"
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
        <p className="text-xs text-muted-foreground">Window: {windowLabel}</p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/providers/${provider.id}`)}>
            Manage
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
