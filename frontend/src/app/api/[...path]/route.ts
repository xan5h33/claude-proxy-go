import { type NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080"
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? ""

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = new URL(path.join("/"), BACKEND + "/")
  url.search = req.nextUrl.search

  const headers = new Headers(req.headers)
  headers.set("x-admin-secret", ADMIN_SECRET)
  headers.delete("host")

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    // @ts-expect-error - duplex required for streaming body
    duplex: "half",
  })

  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  })
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const DELETE = proxy
