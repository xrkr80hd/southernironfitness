import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import LiftLabCookieNotice from "./cookie-notice";
import LiftLabPortal from "./portal";

export const metadata: Metadata = {
  title: "Madie's Lift Lab | Southern Iron Fitness",
  description: "Create an account, request private training, and follow your program with Madie's Lift Lab.",
  manifest: "/lift-lab/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/madies-lift-lab-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/madies-lift-lab-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icons/madies-lift-lab-192.png",
    apple: [{ url: "/icons/madies-lift-lab-apple.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Madie’s Lift Lab",
    description: "Private training, scheduling, and programs with Madie’s Lift Lab.",
    url: "/lift-lab",
    images: [{ url: "/brand/madies-lift-lab-social.jpg", width: 1200, height: 630, alt: "Madie’s Lift Lab" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Madie’s Lift Lab",
    images: ["/brand/madies-lift-lab-social.jpg"],
  },
};

export default function LiftLabPage() {
  return (
    <main className="lift-lab-page">
      <header className="lift-lab-header">
        <Link href="/" className="lift-lab-back">← Southern Iron Fitness</Link>
        <span>Classes · Coaching · Community</span>
      </header>
      <section className="lift-lab-shell">
        <div className="lift-lab-brand-panel">
          <Image
            src="/brand/madies-lift-lab-dark.png"
            alt="Madie's Lift Lab"
            width={1536}
            height={1536}
            priority
          />
          <div>
            <p className="eyebrow">Welcome to the Lift Lab</p>
            <h1>Find your class. Build your strength.</h1>
            <p>Create one simple account to see Madie&apos;s schedule and reserve your spot.</p>
            <aside className="lift-lab-independent-notice">
              <strong>Independent personal training</strong>
              <p>Madie&apos;s Lift Lab is an independently owned and operated personal-training service. Its coaching, scheduling, programs, and fees are separate from Southern Iron Fitness and are not included with a Southern Iron Fitness membership.</p>
            </aside>
          </div>
        </div>
        <LiftLabPortal />
      </section>
      <LiftLabCookieNotice />
    </main>
  );
}
