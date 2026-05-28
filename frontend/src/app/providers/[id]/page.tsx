"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api, Provider, ProviderSettings } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Singapore", "Asia/Kolkata", "Australia/Sydney",
]

function fmtHour(h: number | null): string {
  if (h === null) return "—"
  const ampm = h < 12 ? "AM" : "PM"
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:00 ${ampm}`
}

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [toggling, setToggling] = useState(false)

  const [cap, setCap] = useState("")
  const [startHour, setStartHour] = useState("")
  const [endHour, setEndHour] = useState("")
  const [timezone, setTimezone] = useState("UTC")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")

  const load = async () => {
    try {
      const p = await api.providers.get(id)
      setProvider(p)
      setCap(p.cap === 0 ? "" : String(p.cap))
      setStartHour(p.window_start_hour !== null ? String(p.window_start_hour) : "")
      setEndHour(p.window_end_hour !== null ? String(p.window_end_hour) : "")
      setTimezone(p.window_timezone || "UTC")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleToggleActive = async () => {
    if (!provider) return
    setToggling(true)
    try {
      await api.providers.setActive(provider.id, !provider.is_active)
      await load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setToggling(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!provider) return
    setSaving(true)
    setSaveMsg("")
    try {
      const settings: ProviderSettings = {
        cap: cap === "" ? 0 : parseInt(cap, 10),
        window_start_hour: startHour === "" ? null : parseInt(startHour, 10),
        window_end_hour: endHour === "" ? null : parseInt(endHour, 10),
        window_timezone: timezone,
      }
      await api.providers.updateSettings(provider.id, settings)
      setSaveMsg("Saved")
      await load()
      setTimeout(() => setSaveMsg(""), 2000)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!provider) return null

  const totalTokens = provider.total_input_tokens + provider.total_output_tokens
  const isRateLimited = provider.rate_limited_until
    ? new Date(provider.rate_limited_until) > new Date()
    : false

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/providers")}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1"
        >
          ← Providers
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{provider.name}</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">{provider.account_uuid}</p>
          </div>
          <div className="flex items-center gap-2">
            {isRateLimited && <Badge variant="destructive">Rate Limited</Badge>}
            <Badge variant={provider.is_active ? "default" : "secondary"}>
              {provider.is_active ? "Active" : "Paused"}
            </Badge>
          </div>
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
                  <p className="text-2xl font-bold">{provider.total_input_tokens.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Input</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{provider.total_output_tokens.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Output</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
              {isRateLimited && provider.rate_limited_until && (
                <p className="text-xs text-red-500 text-center mt-4">
                  Rate limited until {new Date(provider.rate_limited_until).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Cap (tokens per window, 0 = unlimited)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={cap}
                  onChange={(e) => setCap(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Window Start Hour (0–23, blank = always on)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    placeholder="e.g. 22 for 10 PM"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Window End Hour (0–23)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    placeholder="e.g. 2 for 2 AM"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                  />
                </div>
              </div>

              {(startHour !== "" || endHour !== "") && (
                <p className="text-xs text-muted-foreground">
                  Window: {fmtHour(startHour === "" ? null : parseInt(startHour))} → {fmtHour(endHour === "" ? null : parseInt(endHour))}
                  {startHour !== "" && endHour !== "" && parseInt(startHour) > parseInt(endHour) && " (crosses midnight)"}
                </p>
              )}

              <div className="space-y-1">
                <Label>Timezone</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
                {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
              </div>
            </CardContent>
          </Card>

          {/* Pause / Resume */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {provider.is_active
                  ? "Provider is active and will receive requests."
                  : "Provider is paused and will not receive requests."}
              </p>
              <Button
                variant={provider.is_active ? "destructive" : "default"}
                onClick={handleToggleActive}
                disabled={toggling}
              >
                {toggling ? "Updating..." : provider.is_active ? "Pause Provider" : "Resume Provider"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
