import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LoggerProvider } from "@/components/LoggerProvider";
import ConsentGate from "@/components/ConsentGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "L.O.V.E. - Listener Observer Versor Experience",
  description: "An ethical AI co-creation and emotional intelligence platform.",
  openGraph: {
    title: "L.O.V.E.",
    description: "An ethical AI co-creation and emotional intelligence platform.",
    url: "https://love.jrgochan.io",
    siteName: "L.O.V.E.",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <LoggerProvider>
          <ConsentGate>{children}</ConsentGate>
        </LoggerProvider>
      </body>
    </html>
  );
}
