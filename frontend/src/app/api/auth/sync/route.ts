import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080"
const PROXY_SECRET = process.env.PROXY_SECRET ?? ""

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? ""

  const res = await fetch(`${BACKEND}/auth/clerk-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": PROXY_SECRET,
    },
    body: JSON.stringify({ clerk_id: userId, email }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
