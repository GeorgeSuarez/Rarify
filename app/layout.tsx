import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Rarify",
    template: "%s | Rarify",
  },
  description:
    "Track your achievements and compare your progress with other players.",
  applicationName: "Rarify",
  icons: {},
  openGraph: {
    title: "Rarify",
    description:
      "Track your achievements and compare your progress with other players.",
    type: "website",
    siteName: "Rarify",
  },
  twitter: {
    card: "summary",
    title: "Rarify",
    description:
      "Track your achievements and compare your progress with other players.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} dark h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://cdn.cloudflare.steamstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://steamcdn-a.akamaihd.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://avatars.cloudflare.steamstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.cloudflare.steamstatic.com" />
        <link rel="dns-prefetch" href="https://steamcdn-a.akamaihd.net" />
      </head>
      <body className="min-h-full flex bg-background text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
