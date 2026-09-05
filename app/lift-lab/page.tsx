import Image from "next/image";
import Link from "next/link";
import LiftLabPortal from "./portal";

export const metadata = {
  title: "Madie's Lift Lab | Southern Iron Fitness",
  description: "Create an account, view classes, and reserve your place with Madie's Lift Lab.",
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
          </div>
        </div>
        <LiftLabPortal />
      </section>
    </main>
  );
}
