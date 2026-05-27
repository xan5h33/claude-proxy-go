"use client"

import { useEffect, useState } from "react"
import { api, User } from "@/lib/api"
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

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">{users.length} API keys</p>
          </div>
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
      </div>
    </main>
  )
}

function UserCard({ user, onDelete }: { user: User; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(user.api_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!confirm("Delete this API key?")) return
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
          <CardTitle className="text-sm font-mono">{user.api_key}</CardTitle>
          <Badge variant="outline">${user.total_used.toFixed(4)} used</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
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
