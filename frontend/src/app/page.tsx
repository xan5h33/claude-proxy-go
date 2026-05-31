"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  const { user, isAdmin, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!user) { router.push("/login"); return }
    if (!isAdmin) { router.push("/dashboard"); return }
  }, [isLoading, user, isAdmin, router])

  if (isLoading || !user || !isAdmin) return <div className="p-8">Loading...</div>

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <p className="text-muted-foreground mb-6">Admin overview</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage proxy users and balances</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/users"><Button>Manage Users</Button></Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Providers</CardTitle>
              <CardDescription>Manage Anthropic token providers</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/providers"><Button>Manage Providers</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
