import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Proxy",
  description: "Claude Code token proxy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${spaceMono.variable}`}>
      <body className="min-h-full flex flex-col font-mono">
        <AuthProvider><TooltipProvider>{children}</TooltipProvider></AuthProvider>
      </body>
    </html>
  );
}
