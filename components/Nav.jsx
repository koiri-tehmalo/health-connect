"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, User, LogOut, Settings } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/appointments", label: "Appointments" },
  { href: "/dashboard/emr", label: "EMR" },
  { href: "/dashboard/prescriptions", label: "Prescriptions" },
  { href: "/dashboard/HealthTracking", label: "HealthTracking" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/admin", label: "Admin" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [healthStatus, setHealthStatus] = useState("normal");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ✅ โหลดข้อมูลผู้ใช้จาก Supabase
  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();

        setUser({
          email: user.email,
          name: profile?.full_name || "ผู้ใช้ระบบ",
          avatar: profile?.avatar_url || null,
        });

        // ✅ จำลองสถานะสุขภาพ
        const rand = Math.random();
        if (rand < 0.7) setHealthStatus("normal");
        else if (rand < 0.9) setHealthStatus("warning");
        else setHealthStatus("critical");
      }
    }
    fetchUser();
  }, []);

  // ✅ ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  /* 🎨 วงแหวนสุขภาพ */
  const ringColor =
    healthStatus === "normal"
      ? "from-emerald-400 to-sky-400"
      : healthStatus === "warning"
      ? "from-yellow-400 to-amber-500"
      : "from-red-500 to-pink-500";

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-transparent backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3">
        {/* 🔹 โลโก้ */}
        <Link
          href="/dashboard"
          className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-emerald-400 text-lg tracking-wide"
        >
          HealthConnect
        </Link>

        {/* 🔹 ปุ่มเมนูมือถือ */}
        <button
          className="md:hidden p-2 border rounded-lg dark:border-gray-600"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* 🔹 เมนูหลัก (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative px-3 py-1 rounded-md text-sm font-medium transition-all duration-300
                ${
                  pathname === l.href
                    ? "bg-gradient-to-r from-sky-500 to-emerald-400 text-white shadow-md"
                    : "text-sky-500 dark:text-sky-400 border border-gray-300 dark:border-gray-600 hover:animate-gradientMove hover:bg-[length:200%_200%] hover:bg-gradient-to-r hover:from-sky-400 hover:via-emerald-400 hover:to-sky-500 hover:text-white"
                }`}
            >
              {l.label}
            </Link>
          ))}

          {/* 🔹 โปรไฟล์พร้อมวงแหวนสุขภาพ */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 border border-gray-400 dark:border-gray-600 rounded-full px-3 py-1 hover:border-sky-400 transition"
            >
              <div
                className={`relative w-8 h-8 rounded-full p-[2px] bg-gradient-to-r ${ringColor}`}
              >
                <div className="bg-white dark:bg-gray-900 rounded-full w-full h-full flex items-center justify-center">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                  )}
                </div>
              </div>
              <span className="text-sm">{user?.name || "Guest"}</span>
            </button>

            {/* 🌈 Dropdown โปรไฟล์ */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-60 rounded-xl border border-transparent bg-gradient-to-br from-sky-400/30 to-emerald-400/30 dark:from-sky-600/20 dark:to-emerald-600/20 backdrop-blur-xl shadow-lg p-[1px] animate-fadeIn">
                <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-3 space-y-3">
                  <div className="text-sm text-center border-b border-gray-300 dark:border-gray-700 pb-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>

                    <div className="mt-2 text-xs">
                      <span
                        className={`px-2 py-1 rounded-full text-white ${
                          healthStatus === "normal"
                            ? "bg-emerald-500"
                            : healthStatus === "warning"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                      >
                        {healthStatus === "normal"
                          ? "สุขภาพปกติ"
                          : healthStatus === "warning"
                          ? "ควรตรวจเช็ก"
                          : "มีความเสี่ยง!"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 transition-all hover:animate-gradientMove hover:bg-[length:200%_200%] hover:bg-gradient-to-r hover:from-sky-400 hover:via-emerald-400 hover:to-sky-500 hover:text-white"
                  >
                    <Settings size={16} /> แก้ไขข้อมูลส่วนตัว
                  </Link>

                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-all"
                  >
                    <LogOut size={16} /> ออกจากระบบ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔹 เมนูมือถือ */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 backdrop-blur-md bg-transparent">
          <div className="flex flex-col p-3 space-y-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                  pathname === l.href
                    ? "bg-gradient-to-r from-sky-500 to-emerald-400 text-white"
                    : "border-gray-400 hover:animate-gradientMove hover:bg-[length:200%_200%] hover:bg-gradient-to-r hover:from-sky-400 hover:via-emerald-400 hover:to-sky-500 text-gray-700 dark:text-gray-300"
                }`}
              >
                {l.label}
              </Link>
            ))}

            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
              className="border text-sm py-2 rounded-lg hover:border-red-500 hover:text-red-600"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
