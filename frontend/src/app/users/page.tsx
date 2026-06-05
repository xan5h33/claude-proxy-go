"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, User } from "@/lib/api"
import { AppShell } from "@/components/app-shell"
import { Spinner } from "@/components/spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    try {
      setUsers(await api.users.list())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      await api.users.create()
      await load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to create")
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <AppShell>
      {loading
        ? <Spinner className="min-h-64" />
        : error
          ? <div className="p-6 text-sm text-destructive">{error}</div>
          : <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">{users.length} users</p>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Create API Key"}
          </Button>
        </div>

        <div className="grid gap-4">
          {users.length === 0 && (
            <p className="text-muted-foreground text-center py-12">No users yet.</p>
          )}
          {users.map((u) => (
            <UserCard key={u.id} user={u} onDelete={load} />
          ))}
        </div>
      </div>}
    </AppShell>
  )
}

function UserCard({ user, onDelete }: { user: User; onDelete: () => void }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const total = user.total_input_tokens + user.total_output_tokens

  const handleCopy = () => {
    navigator.clipboard.writeText(user.api_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!confirm("Delete this user?")) return
    setDeleting(true)
    try {
      await api.users.delete(user.id)
      onDelete()
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
            className="text-base font-mono hover:underline cursor-pointer"
            onClick={() => router.push(`/users/${user.id}`)}
          >
            {user.email || user.api_key}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{total.toLocaleString()} used</Badge>
            <Badge variant={(user.balance ?? 0) <= 0 ? "destructive" : "secondary"}>
              {(user.balance ?? 0).toLocaleString()} left
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/users/${user.id}`)}>
            Manage
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy Key"}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
