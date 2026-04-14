import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daylog - Logistics CRM",
  description: "Logistics operations and CRM management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Animated liquid glass background */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute inset-0 bg-[#f8f9fb] dark:bg-[#030c1a]" />
          {/* Orb 1 - blue, top-left */}
          <div
            className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-blue-400/15 dark:bg-blue-600/20 blur-[120px] animate-blob"
            style={{ animationDelay: "0s" }}
          />
          {/* Orb 2 - violet, top-right */}
          <div
            className="absolute -right-40 top-1/4 h-[500px] w-[500px] rounded-full bg-violet-400/15 dark:bg-violet-600/20 blur-[120px] animate-blob"
            style={{ animationDelay: "2.5s" }}
          />
          {/* Orb 3 - cyan, bottom-left */}
          <div
            className="absolute -bottom-20 left-1/4 h-[500px] w-[500px] rounded-full bg-cyan-400/10 dark:bg-cyan-500/15 blur-[120px] animate-blob"
            style={{ animationDelay: "5s" }}
          />
          {/* Orb 4 - indigo, center */}
          <div
            className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/8 dark:bg-indigo-600/10 blur-[100px] animate-pulse-glow"
          />
          {/* Noise grain overlay */}
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
