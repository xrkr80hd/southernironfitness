import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.southernironfitness.com"),
  title: "Southern Iron Fitness | Woodworth, Louisiana",
  description:
    "Southern Iron Fitness is a premium strength and conditioning gym coming soon to Woodworth, Louisiana.",
  other: {
    "codex-preview": "development",
  },
  manifest: "/manifest.webmanifest",
  applicationName: "Southern Iron Fitness",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Southern Iron",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "16x16 32x32 48x48" },
      { url: "/icons/southern-iron-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/southern-iron-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icons/southern-iron-192.png",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Southern Iron Fitness",
    description: "Premium strength and conditioning in Woodworth, Louisiana.",
    url: "/",
    siteName: "Southern Iron Fitness",
    images: [{ url: "/brand/southern-iron-social.jpg", width: 1200, height: 630, alt: "Southern Iron Fitness" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Southern Iron Fitness",
    description: "Premium strength and conditioning in Woodworth, Louisiana.",
    images: ["/brand/southern-iron-social.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
