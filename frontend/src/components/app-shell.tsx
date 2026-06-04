"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
        <SidebarHeader className="px-4 py-4">
          <Link href="/" className="text-base font-bold tracking-tight text-primary hover:opacity-80 transition-opacity">proxy</Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {userNav.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    render={<Link href={href} />}
                    isActive={pathname === href}
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarMenu>
                {adminNav.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={pathname === href || pathname.startsWith(href + "/")}
                    >
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="px-4 py-3">
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </SidebarFooter>
      </Sidebar>

      <div className="flex flex-col flex-1 min-h-screen min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => { logout(); router.push("/login") }}
          >
            <LogOut className="size-3" />
            Sign out
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
