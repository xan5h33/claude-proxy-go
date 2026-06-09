"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { dashboard, Provider, ProviderSettings, PayoutRequest } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
import { Spinner } from "@/components/spinner"
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

export default function MyProvidersPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [isLoading, user, router])

  const load = async () => {
    try {
      setProviders(await dashboard.listProviders())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <AppShell>
      {isLoading || !user
        ? <Spinner className="min-h-64" />
        : <div className="max-w-3xl mx-auto">
        <RegisterInstructions apiKey={user.api_key} />

        {loading ? (
          <Spinner className="py-6" />
        ) : providers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No providers registered yet.</p>
        ) : (
          <div className="grid gap-6">
            {providers.map((p) => (
              <ProviderCard key={p.id} provider={p} onUpdate={load} />
            ))}
          </div>
        )}
      </div>}
    </AppShell>
  )
}

function RegisterInstructions({ apiKey }: { apiKey: string }) {
  const [copiedSh, setCopiedSh] = useState(false)
  const [copiedPs, setCopiedPs] = useState(false)
  const shCmd = `./register.sh ${apiKey}`
  const psCmd = `.\\register.ps1 ${apiKey}`

  const copy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-6 p-4 bg-muted/40 rounded-lg space-y-3">
      <p className="text-sm text-muted-foreground">
        Register a new machine as a provider by running the script below.
      </p>
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-md">
        <span className="text-amber-600 dark:text-amber-400 text-sm font-medium shrink-0">Before you run:</span>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Make sure you&apos;re logged into Claude Code on that machine first — run <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">claude login</code> if you haven&apos;t already.
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">macOS / Linux</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm bg-background border rounded px-3 py-2 break-all">{shCmd}</code>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => copy(shCmd, setCopiedSh)}>
            {copiedSh ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Windows (PowerShell)</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm bg-background border rounded px-3 py-2 break-all">{psCmd}</code>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => copy(psCmd, setCopiedPs)}>
            {copiedPs ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>
      <div className="flex gap-2">
        <a href="/register.sh" download="register.sh">
          <Button size="sm" variant="outline">Download .sh</Button>
        </a>
        <a href="/register.ps1" download="register.ps1">
          <Button size="sm" variant="outline">Download .ps1</Button>
        </a>
      </div>
    </div>
  )
}

function ProviderCard({ provider, onUpdate }: { provider: Provider; onUpdate: () => void }) {
  const [token, setToken] = useState("")
  const [savingToken, setSavingToken] = useState(false)
  const [toggling, setToggling] = useState(false)

  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutMsg, setPayoutMsg] = useState("")

  useEffect(() => {
    dashboard.listProviderPayouts(provider.id)
      .then(setPayouts)
      .catch(() => {})
  }, [provider.id])

  const hasPending = payouts.some(p => p.status === "pending")
  const canPayout = (provider.earnings ?? 0) >= 10 && !hasPending

  const handleRequestPayout = async () => {
    setPayoutLoading(true)
    setPayoutMsg("")
    try {
      const pr = await dashboard.requestPayout(provider.id)
      setPayouts(prev => [pr, ...prev])
      setPayoutMsg("Payout requested — we'll process it within a few days.")
    } catch (e: unknown) {
      setPayoutMsg(e instanceof Error ? e.message : "Failed")
    } finally {
      setPayoutLoading(false)
    }
  }

  const [cap, setCap] = useState(provider.cap === 0 ? "" : String(provider.cap))
  const [startHour, setStartHour] = useState(provider.window_start_hour !== null ? String(provider.window_start_hour) : "")
  const [endHour, setEndHour] = useState(provider.window_end_hour !== null ? String(provider.window_end_hour) : "")
  const [timezone, setTimezone] = useState(provider.window_timezone || "UTC")
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState("")

  const total = provider.total_input_tokens + provider.total_output_tokens
  const isRateLimited = provider.rate_limited_until
    ? new Date(provider.rate_limited_until) > new Date()
    : false

  const handleUpdateToken = async () => {
    if (!token.trim()) return
    setSavingToken(true)
    try {
      await dashboard.updateProviderTokens(provider.id, token.trim())
      setToken("")
      onUpdate()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed")
    } finally {
      setSavingToken(false)
    }
  }

  const handleToggle = async () => {
    setToggling(true)
    try {
      await dashboard.setProviderActive(provider.id, !provider.is_active)
      onUpdate()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed")
    } finally {
      setToggling(false)
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    setSettingsMsg("")
    try {
      const settings: ProviderSettings = {
        cap: cap === "" ? 0 : parseInt(cap, 10),
        window_start_hour: startHour === "" ? null : parseInt(startHour, 10),
        window_end_hour: endHour === "" ? null : parseInt(endHour, 10),
        window_timezone: timezone,
      }
      await dashboard.updateProviderSettings(provider.id, settings)
      setSettingsMsg("Saved")
      onUpdate()
      setTimeout(() => setSettingsMsg(""), 2000)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed")
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{provider.name}</CardTitle>
          <div className="flex items-center gap-2">
            {isRateLimited && <Badge variant="destructive">Rate Limited</Badge>}
            <Badge variant={provider.is_active ? "default" : "secondary"}>
              {provider.is_active ? "Active" : "Paused"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="p-2 bg-muted/40 rounded-lg">
            <p className="text-xl font-bold">{provider.total_input_tokens.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Input served</p>
          </div>
          <div className="p-2 bg-muted/40 rounded-lg">
            <p className="text-xl font-bold">{provider.total_output_tokens.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Output served</p>
          </div>
          <div className="p-2 bg-muted/40 rounded-lg">
            <p className="text-xl font-bold">{total.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total served</p>
          </div>
          <div className="p-2 bg-muted/40 rounded-lg">
            <p className="text-xl font-bold text-primary">${(provider.earnings ?? 0).toFixed(4)}</p>
            <p className="text-sm text-muted-foreground">Earnings</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Rate: $5.00 per million tokens served</p>

        {/* Availability window */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Availability Window</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Start hour (0–23)</Label>
              <Input type="number" min="0" max="23" placeholder="always on" value={startHour} onChange={(e) => setStartHour(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">End hour (0–23)</Label>
              <Input type="number" min="0" max="23" placeholder="always on" value={endHour} onChange={(e) => setEndHour(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Timezone</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Daily cap (tokens, 0 = unlimited)</Label>
            <Input type="number" min="0" placeholder="0" value={cap} onChange={(e) => setCap(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save"}
            </Button>
            {settingsMsg && <span className="text-xs text-green-600">{settingsMsg}</span>}
          </div>
        </div>

        {/* Payout */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Payout</p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleRequestPayout}
              disabled={!canPayout || payoutLoading}
            >
              {payoutLoading ? "Requesting..." : "Request Payout"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {hasPending ? "Pending request in progress" : `$10.00 minimum · current: $${(provider.earnings ?? 0).toFixed(4)}`}
            </span>
          </div>
          {payoutMsg && (
            <p className={`text-xs ${payoutMsg.startsWith("Payout requested") ? "text-green-600" : "text-destructive"}`}>
              {payoutMsg}
            </p>
          )}
          {payouts.length > 0 && (
            <div className="border border-border divide-y divide-border text-sm">
              {payouts.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                  <span className="font-mono">${p.amount.toFixed(4)}</span>
                  <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh token + pause/resume */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="New refresh token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="h-8 text-xs"
              type="password"
            />
            <Button size="sm" variant="outline" onClick={handleUpdateToken} disabled={savingToken || !token.trim()} className="shrink-0">
              Update Token
            </Button>
          </div>
          <Button
            size="sm"
            variant={provider.is_active ? "outline" : "default"}
            onClick={handleToggle}
            disabled={toggling}
          >
            {toggling ? "..." : provider.is_active ? "Pause" : "Resume"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
