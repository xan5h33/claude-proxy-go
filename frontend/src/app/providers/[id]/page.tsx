"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { api, Provider, ProviderSettings } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
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
      alert(e instanceof Error ? e.message : "Failed")
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
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">{provider.name}</h2>
            <p className="text-xs text-muted-foreground font-mono">{provider.account_uuid}</p>
          </div>
          <div className="flex items-center gap-2">
            {isRateLimited && <Badge variant="destructive">Rate Limited</Badge>}
            <Badge variant={provider.is_active ? "default" : "secondary"}>
              {provider.is_active ? "Active" : "Paused"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Daily cap (tokens, 0 = unlimited)</Label>
                <Input type="number" min="0" placeholder="0" value={cap} onChange={(e) => setCap(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Window start (hour 0–23)</Label>
                  <Input type="number" min="0" max="23" placeholder="e.g. 22" value={startHour} onChange={(e) => setStartHour(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Window end (hour 0–23)</Label>
                  <Input type="number" min="0" max="23" placeholder="e.g. 6" value={endHour} onChange={(e) => setEndHour(e.target.value)} />
                </div>
              </div>
              {(startHour !== "" || endHour !== "") && (
                <p className="text-xs text-muted-foreground">
                  {fmtHour(startHour === "" ? null : parseInt(startHour))} → {fmtHour(endHour === "" ? null : parseInt(endHour))}
                  {startHour !== "" && endHour !== "" && parseInt(startHour) > parseInt(endHour) && " (crosses midnight)"}
                </p>
              )}
              <div className="space-y-1">
                <Label>Timezone</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {provider.is_active ? "Active and receiving requests." : "Paused — not receiving requests."}
              </p>
              <Button variant={provider.is_active ? "destructive" : "default"} onClick={handleToggleActive} disabled={toggling}>
                {toggling ? "Updating..." : provider.is_active ? "Pause" : "Resume"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
