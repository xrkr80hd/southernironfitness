import Link from "next/link";
import SouthernIronAdmin from "./panel";

export const metadata = { title: "Master Admin | Southern Iron Fitness" };

export default function AdminPage() {
  return (
    <main className="lift-lab-admin-page">
      <header className="lift-lab-header">
        <Link href="/" className="lift-lab-back">← Southern Iron Fitness</Link>
        <span>Secure master administration</span>
      </header>
      <SouthernIronAdmin />
    </main>
  );
}
