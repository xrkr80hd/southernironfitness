import Link from "next/link";
import LiftLabAdmin from "./panel";

export const metadata = { title: "Madie's Dashboard | Lift Lab" };

export default function LiftLabAdminPage() {
  return (
    <main className="lift-lab-admin-page">
      <header className="lift-lab-header">
        <Link href="/lift-lab" className="lift-lab-back">← Account home</Link>
        <span>Madie&apos;s private dashboard</span>
      </header>
      <LiftLabAdmin />
    </main>
  );
}
