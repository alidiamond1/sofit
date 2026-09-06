import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Anton } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
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

const displayFont = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sofit.so"),
  applicationName: "SoFit",
  title: { default: "SoFit — Fitness & Nutrition Coaching", template: "%s · SoFit" },
  description: "Personal training, custom meal & workout plans, and daily accountability — all in one calm coaching app.",
  appleWebApp: { capable: true, title: "SoFit", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "SoFit",
    url: "/",
    title: "SoFit — Fitness & Nutrition Coaching",
    description: "Personal coaching, clear plans, and progress you can read.",
    images: [{ url: "/brand/coach-training-03.jpg", width: 2560, height: 1707, alt: "Coach Ali at SoFit." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SoFit — Fitness & Nutrition Coaching",
    description: "Personal coaching, clear plans, and progress you can read.",
    images: ["/brand/coach-training-03.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

/* Caps every page render and Server Action under this layout. Without it a
   stalled query can hold an invocation open until the platform ceiling, which
   the visitor experiences as a page that loads forever and then 503s. */
export const maxDuration = 20;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable}`}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider>
          {children}
          <PwaRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
