import Link from "next/link"
import { SignUp } from "@clerk/nextjs"
import { Wordmark } from "@/components/wordmark"

const appearance = {
  variables: {
    fontFamily: "var(--font-space-mono), monospace",
    colorPrimary: "#fafafa",
    colorBackground: "#0a0a0a",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1aa",
    colorInputBackground: "#141414",
    colorInputText: "#fafafa",
    colorNeutral: "#a1a1aa",
    borderRadius: "0px",
  },
  elements: {
    card: "shadow-none border border-[#1f1f1f]",
    formButtonPrimary: "bg-[#fafafa] text-[#0a0a0a] hover:opacity-90",
    footerActionLink: "text-[#fafafa] hover:opacity-80",
  },
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/"><Wordmark className="text-lg" /></Link>
      </nav>
      <div className="flex-1 flex items-start justify-center pt-16 p-6">
        <SignUp appearance={appearance} forceRedirectUrl="/dashboard" />
      </div>
    </main>
  )
}
