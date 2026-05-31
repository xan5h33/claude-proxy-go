import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider><TooltipProvider>{children}</TooltipProvider></AuthProvider>
      </body>
    </html>
  );
}
