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
  title: "ladle",
  description: "Share your Claude quota, earn while you sleep.",
  openGraph: {
    title: "ladle",
    description: "Share your Claude quota, earn while you sleep.",
    siteName: "ladle",
  },
  twitter: {
    card: "summary",
    title: "ladle",
    description: "Share your Claude quota, earn while you sleep.",
  },
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
