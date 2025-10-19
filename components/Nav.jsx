"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/appointments", label: "Appointments" },
  /*{ href: "/dashboard/emr", label: "EMR" },
  { href: "/dashboard/prescriptions", label: "Prescriptions" },
  { href: "/dashboard/reminders", label: "Medication" },
  { href: "/dashboard/wearables", label: "Wearables" },
  { href: "/dashboard/analytics", label: "AI Analytics" },*/
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/admin", label: "Admin" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-10 border-b bg-white mb-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3">
        <Link href="/dashboard" className="font-semibold">
          HealthConnect
        </Link>
        <div className="flex gap-2 flex-wrap">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1 rounded-lg border ${
                pathname === l.href ? "bg-sky-50 border-sky-200" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={signOut} className="btn border">
            ออกจากระบบ
          </button>
        </div>
      </div>
    </nav>
  );
}
