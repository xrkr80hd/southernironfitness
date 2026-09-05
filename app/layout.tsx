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
      { url: "/icons/southern-iron-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/southern-iron-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icons/southern-iron-192.png",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
