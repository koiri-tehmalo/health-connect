"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [userId, setUserId] = useState(null);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    console.log("🔹 Current user:", user.id);

    setUserId(user.id);
    const { data, error } = await supabase
      .from("alerts")
      .select("id, type, message, created_at, patient_id")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.error("❌ Fetch error:", error.message);
    else console.log("✅ Alerts data:", data);

    if (!error) setItems(data || []);
  }

  useEffect(() => {
    load();
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
          setItems((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Notification Center</h1>

      {items.length === 0 ? (
        <div className="text-gray-500">ยังไม่มีการแจ้งเตือน</div>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="card">
              <div className="text-sm text-gray-500">
                {dayjs(a.created_at).format("YYYY-MM-DD HH:mm")}
              </div>
              <div className="font-medium mt-1">{a.message}</div>
              <div className="text-xs text-gray-600 mt-1">ประเภท: {a.type}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
