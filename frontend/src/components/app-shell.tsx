"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { Wordmark } from "@/components/wordmark"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, History, Server, Users, Cpu, LogOut } from "lucide-react"

const userNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/usage", label: "Usage History", icon: History },
  { href: "/my-providers", label: "Providers", icon: Server },
]

const adminNav = [
  { href: "/users", label: "Users", icon: Users },
  { href: "/providers", label: "Providers", icon: Cpu },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <SidebarProvider>
      <Sidebar className="border-r">
        <SidebarHeader className="h-16 flex-row items-center px-5 border-b border-border">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Wordmark className="text-2xl" />
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          <nav className="flex flex-col gap-1">
            {userNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  pathname === href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {isAdmin && (
            <div className="mt-6">
              <p className="px-4 text-xs text-muted-foreground uppercase tracking-widest mb-2">Admin</p>
              <nav className="flex flex-col gap-1">
                {adminNav.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      pathname === href || pathname.startsWith(href + "/")
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className="px-5 py-4 border-t border-border">
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </SidebarFooter>
      </Sidebar>

      <div className="flex flex-col flex-1 min-h-screen min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur-sm px-6">
          <SidebarTrigger className="size-5" />
          <div className="flex-1" />
          <span className="text-base text-muted-foreground hidden sm:block">{user?.email}</span>
          <button
            className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            onClick={() => { logout(); router.push("/login") }}
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
