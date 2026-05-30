import { type NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080"

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = new URL(path.join("/"), BACKEND + "/")
  url.search = req.nextUrl.search

  const reqHeaders = new Headers(req.headers)
  reqHeaders.delete("host")

  const res = await fetch(url, {
    method: req.method,
    headers: reqHeaders,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    // @ts-expect-error - duplex required for streaming body
    duplex: "half",
  })

  const resHeaders = new Headers(res.headers)
  resHeaders.delete("content-encoding")
  resHeaders.delete("transfer-encoding")

  return new NextResponse(res.body, {
    status: res.status,
    headers: resHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const DELETE = proxy
