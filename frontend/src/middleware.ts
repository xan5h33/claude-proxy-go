import { auth } from "@/auth"
import { NextResponse } from "next/server"

const PUBLIC = ["/", "/login", "/register"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC.some(p => pathname === p || pathname.startsWith(p + "/"))
  const isApi = pathname.startsWith("/api")

  if (!isPublic && !isApi && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.ico$|.*\\.svg$).*)"],
}
