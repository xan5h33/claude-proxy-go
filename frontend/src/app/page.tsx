"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const { user, isAdmin, isLoading, logout } = useAuth()
  const router = useRouter()

  if (isLoading) return <div className="p-8">Loading...</div>

  if (!user) {
    router.push("/login")
    return null
  }

  if (!isAdmin) {
    router.push("/dashboard")
    return null
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Claude Proxy</h1>
            <p className="text-muted-foreground">Admin Dashboard · {user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
              My Account
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Providers</CardTitle>
              <CardDescription>Manage Anthropic token providers</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/providers">
                <Button>Manage Providers</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage proxy API keys and caps</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/users">
                <Button>Manage Users</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Portal</CardTitle>
              <CardDescription>Self-service via API key</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/portal">
                <Button variant="outline">Open Portal</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
