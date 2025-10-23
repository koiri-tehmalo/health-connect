"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [userId, setUserId] = useState(null);

  // 🔹 โหลดข้อมูลการแจ้งเตือน
  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);
    const { data, error } = await supabase
      .from("alerts")
      .select("id, type, message, created_at, patient_id")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.error("❌ Fetch error:", error.message);
    else setItems(data || []);
  }

  // 🔹 โหลดข้อมูลเมื่อเปิดหน้า
  useEffect(() => {
    load();
  }, []);

  // 🔹 Sub realtime เมื่อมี INSERT ใหม่
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
          setItems((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* หัวข้อ */}
      <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#007BFF] to-[#00C6A7] mb-6">
        การแจ้งเตือน (Notification Center)
      </h1>

      {/* ถ้าไม่มีการแจ้งเตือน */}
      {items.length === 0 ? (
        <div className="text-gray-500 bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-sm text-center">
          ยังไม่มีการแจ้งเตือน
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <div
              key={a.id}
              className="bg-white/90 backdrop-blur-lg p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800">{a.message}</span>
                <span className="text-xs text-gray-400">
                  {dayjs(a.created_at).format("DD MMM YYYY HH:mm")}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                ประเภท:{" "}
                <span className="font-medium text-[#00C6A7]">{a.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
