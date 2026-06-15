import { auth } from "@/auth"
import { NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080"
const PROXY_SECRET = process.env.PROXY_SECRET ?? ""

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const res = await fetch(`${BACKEND}/auth/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": PROXY_SECRET,
    },
    body: JSON.stringify({ email: session.user.email }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
