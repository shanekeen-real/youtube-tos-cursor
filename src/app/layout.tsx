import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "../components/ClientLayout";
import { SessionProvider } from '@/lib/imports';
import { ToastProvider } from "../contexts/ToastContext";
import { Toaster } from "../components/ui/toaster";
import "./block-extensions";

export const metadata: Metadata = {
  title: "Yellow Dollar - YouTube Demonetization Protection & Revenue Safety",
  description: "Protect your YouTube revenue from demonetization with AI-powered content analysis. Get instant risk assessment and fix recommendations to keep your channel monetized. Trusted by creators worldwide.",
  keywords: "yellow dollar, youtube demonetization, youtube revenue protection, youtube protection, youtube demonetization protection, youtube monetization, content analysis",
  openGraph: {
    title: "Yellow Dollar - YouTube Demonetization Protection",
    description: "AI-powered YouTube content analysis to prevent demonetization and protect your revenue",
    type: "website",
    url: "https://yellowdollar.com",
    siteName: "Yellow Dollar"
  },
  twitter: {
    card: "summary_large_image",
    title: "Yellow Dollar - YouTube Demonetization Protection",
    description: "AI-powered YouTube content analysis to prevent demonetization and protect your revenue"
  }
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white font-sans`}>
        <SessionProvider>
          <ToastProvider>
            <ClientLayout>{children}</ClientLayout>
            <Toaster />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
