import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Claude Proxy</h1>
        <p className="text-muted-foreground mb-8">Admin Dashboard</p>

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
              <CardDescription>Self-service — view usage, update cap, rotate key</CardDescription>
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
