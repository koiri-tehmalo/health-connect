"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, User, LogOut, Settings, Bell } from "lucide-react";
import dayjs from "dayjs";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/appointments", label: "Appointments" },
  { href: "/dashboard/emr", label: "EMR" },
  { href: "/dashboard/prescriptions", label: "Prescriptions" },
  { href: "/dashboard/HealthTracking", label: "HealthTracking" },
  { href: "/dashboard/admin", label: "Admin" },
];

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // ✅ โหลดการแจ้งเตือน
  const [loadingUser, setLoadingUser] = useState(true); // ✅ เพิ่ม state เช็คโหลดเสร็จหรือยัง

  useEffect(() => {
    async function fetchUserAndAlerts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      // ✅ โหลดโปรไฟล์พร้อม role_id
      const { data: profile } = await supabase
        .from("users")
        .select("full_name, avatar_url, role_id")
        .eq("id", user.id)
        .maybeSingle(); // กันกรณีไม่เจอแถว จะไม่ throw 406

      const userObj = {
        email: user.email,
        name: profile?.full_name || "ผู้ใช้ระบบ",
        avatar: profile?.avatar_url || null,
        role_id: Number(profile?.role_id) || 1, // แคสต์ให้เป็น number (กัน "3" !== 3)
        id: user.id,
      };
      console.log("User profile:", userObj); // Debug log
      setUser(userObj);

      // ✅ โหลดการแจ้งเตือนหลังรู้ user.id แล้ว
      const { data: alerts, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) {
        setAlerts(alerts || []);
        setUnreadCount(alerts.filter((a) => !a.is_read).length);
      }

      setLoadingUser(false); // ✅ เสร็จแล้ว
    }

    fetchUserAndAlerts();
  }, []);

  // ✅ เพิ่มเงาเมื่อ scroll
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("realtime:alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
          filter: `patient_id=eq.${userId}`,
        },
        (payload) => {
          setAlerts((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ✅ ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleOutsideClick(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        notifRef.current &&
        !notifRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? "shadow-md shadow-cyan-200/30" : ""
      } bg-white/70 backdrop-blur-md border-b border-white/40`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3">
        {/* โลโก้ */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group transition-all hover:opacity-90"
        >
          <div className="relative w-20 h-20 overflow-visible transition-all duration-300 group-hover:scale-105">
            <img
              src="/health.png" // ✅ ใช้โลโก้ .png พื้นหลังโปร่งใส
              alt="HealthConnect Logo"
              className="object-contain w-full h-full"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#007BFF] to-[#00C6A7] text-lg tracking-wide">
              Health
            </span>
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00C6A7] to-[#007BFF] text-lg tracking-wide">
              Connect
            </span>
          </div>
        </Link>

        {/* 📱 ปุ่มมือถือ */}
        <div className="flex items-center gap-3 md:hidden">
          {/* 🔔 แจ้งเตือน (mobile) */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setDropdownOpen(false);
              }}
              className="relative w-9 h-9 flex items-center justify-center rounded-md
               border border-[#00C6A7]/50 text-[#007BFF] hover:text-[#00C6A7]
               bg-white/40 backdrop-blur-md hover:bg-white transition-all"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* กล่องแจ้งเตือนมือถือ */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white/95 backdrop-blur-lg border border-gray-200 shadow-lg animate-slideDown z-50">
                <div className="p-4">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      การแจ้งเตือน
                    </span>
                    <button
                      onClick={() => setUnreadCount(0)}
                      className="text-xs text-[#007BFF] hover:text-[#00C6A7]"
                    >
                      ทำเครื่องหมายว่าอ่านแล้ว
                    </button>
                  </div>
                  {alerts.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-3">
                      ไม่มีการแจ้งเตือน
                    </p>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                      {alerts.map((a) => (
                        <li
                          key={a.id}
                          className={`p-2 text-sm ${
                            a.is_read
                              ? "text-gray-500 bg-white"
                              : " text-gray-800"
                          }`}
                        >
                          <div className="font-medium">{a.message}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {dayjs(a.created_at).format("DD MMM YYYY HH:mm")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* ปุ่มไปหน้าแจ้งเตือนทั้งหมด */}
                {alerts.length > 0 && (
                  <div className="border-t border-gray-200 text-center py-2">
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        router.push("/dashboard/notifications");
                      }}
                      className="text-sm text-[#007BFF] hover:text-[#00C6A7] font-medium"
                    >
                      🔎 ดูการแจ้งเตือนทั้งหมด
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 👤 โปรไฟล์ (mobile) */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setNotifOpen(false);
              }}
              className="w-9 h-9 flex items-center justify-center rounded-full
                         border border-[#00C6A7]/40 bg-white/60 backdrop-blur-lg text-gray-800 hover:bg-white transition-all"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User size={18} />
              )}
            </button>

            {/* กล่องโปรไฟล์มือถือ */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-lg bg-white/95 backdrop-blur-lg shadow-lg border border-gray-200 p-3 space-y-2 animate-slideDown z-50">
                <div className="text-center border-b border-gray-200 pb-2">
                  <p className="text-xs text-gray-600 truncate">
                    {user?.email}
                  </p>
                </div>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#007BFF] text-sm transition-all"
                >
                  <Settings size={16} /> แก้ไขข้อมูลส่วนตัว
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm transition-all"
                >
                  <LogOut size={16} /> ออกจากระบบ
                </button>
              </div>
            )}
          </div>

          {/* ☰ เมนู */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-[#007BFF] hover:text-[#00C6A7] transition-all"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* 💻 เมนู Desktop */}
        <div className="hidden md:flex items-center gap-3">
          {!loadingUser &&
            links
              .filter(
                (l) => !(l.href === "/dashboard/admin" && userId?.role_id !== 3)
              ) // ✅ ซ่อน Admin ถ้าไม่ใช่ role_id=3
              .map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-300 ${
                    pathname === l.href
                      ? "bg-gradient-to-r from-[#007BFF] to-[#00C6A7] text-white shadow-sm"
                      : "text-[#007BFF] hover:text-[#00C6A7]"
                  }`}
                >
                  {l.label}
                </Link>
              ))}

          {/* 🔔 แจ้งเตือน (desktop) */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setDropdownOpen(false);
              }}
              className="relative w-9 h-9 flex items-center justify-center rounded-md
               border border-[#00C6A7]/50 text-[#007BFF] hover:text-[#00C6A7]
               bg-white/40 backdrop-blur-md hover:bg-white transition-all"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white/95 backdrop-blur-lg border border-gray-200 shadow-lg animate-slideDown z-50">
                <div className="p-4">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      การแจ้งเตือน
                    </span>
                    <button
                      onClick={() => setUnreadCount(0)}
                      className="text-xs text-[#007BFF] hover:text-[#00C6A7]"
                    >
                      ทำเครื่องหมายว่าอ่านแล้ว
                    </button>
                  </div>

                  {alerts.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-3">
                      ไม่มีการแจ้งเตือน
                    </p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                      {alerts.map((a) => (
                        <li
                          key={a.id}
                          className={`p-2 text-sm ${
                            a.is_read
                              ? "text-gray-500 bg-white"
                              : " text-gray-800"
                          }`}
                        >
                          <div className="font-medium">{a.message}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {dayjs(a.created_at).format("DD MMM YYYY HH:mm")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* ปุ่มไปหน้าแจ้งเตือนทั้งหมด */}
                {alerts.length > 0 && (
                  <div className="border-t border-gray-200 text-center py-2">
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        router.push("/dashboard/notifications");
                      }}
                      className="text-sm text-[#007BFF] hover:text-[#00C6A7] font-medium"
                    >
                      🔎 ดูการแจ้งเตือนทั้งหมด
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 👤 โปรไฟล์ (desktop) */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setNotifOpen(false);
              }}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-[#00C6A7]/40 bg-white/60 backdrop-blur-md text-gray-800 hover:bg-white transition-all"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User size={18} />
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-lg bg-white/95 backdrop-blur-lg shadow-lg border border-gray-200 p-3 space-y-2 animate-slideDown z-50">
                <div className="text-center border-b border-gray-200 pb-2">
                  <p className="text-xs text-gray-600 truncate">
                    {user?.email}
                  </p>
                </div>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#007BFF] text-sm transition-all"
                >
                  <Settings size={16} /> แก้ไขข้อมูลส่วนตัว
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm transition-all"
                >
                  <LogOut size={16} /> ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📱 เมนูมือถือ */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white/80 backdrop-blur-xl border-t border-white/40 z-40 animate-slideDown">
          <div className="flex flex-col px-4 py-3 space-y-2">
            {links
              .filter(
                (l) => !(l.href === "/dashboard/admin" && user?.role_id !== 3)
              ) // ✅ ซ่อน Admin ถ้าไม่ใช่ role_id=3
              .map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    pathname === l.href
                      ? "bg-gradient-to-r from-[#007BFF] to-[#00C6A7] text-white"
                      : "text-[#007BFF] hover:text-[#00C6A7]"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
          </div>
        </div>
      )}
    </nav>
  );
}
