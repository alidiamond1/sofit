import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "SoFit",
  title: { default: "SoFit — Fitness & Nutrition Coaching", template: "%s · SoFit" },
  description: "Personal training, custom diet & workout plans, and daily accountability — all in one calm coaching app.",
  appleWebApp: { capable: true, title: "SoFit", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1f75b9",
};

/* Caps every page render and Server Action under this layout. Without it a
   stalled query can hold an invocation open until the platform ceiling, which
   the visitor experiences as a page that loads forever and then 503s. */
export const maxDuration = 20;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
