import type { Metadata } from "next";
import { Inter, Public_Sans } from "next/font/google";

import { AppProviders } from "@/components/composite/app-providers";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Layanan LKPP",
    template: "%s | Layanan LKPP",
  },
  description: "Portal layanan publik digital LKPP untuk jadwal, antrean, dan informasi layanan.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=lkpp-20260614" },
      { url: "/pwa/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/pwa/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico?v=lkpp-20260614"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${publicSans.variable} ${inter.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-body">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
