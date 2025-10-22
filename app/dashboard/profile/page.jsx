"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    citizen_id: "",
    full_name: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ โหลดข้อมูลผู้ใช้จาก Supabase
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMsg("ไม่พบผู้ใช้ที่เข้าสู่ระบบ");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("citizen_id, full_name, phone")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        setMsg("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();
  }, []);

  // ✅ ฟังก์ชันบันทึกการแก้ไข
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMsg("ไม่พบผู้ใช้");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        citizen_id: profile.citizen_id,
        full_name: profile.full_name,
        phone: profile.phone,
      })
      .eq("id", user.id);

    if (error) {
      console.error(error);
      setMsg("❌ เกิดข้อผิดพลาดในการบันทึก");
    } else {
      setMsg("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
    }

    setSaving(false);
  }

  if (loading) return <p className="p-4">⏳ กำลังโหลดข้อมูล...</p>;

  return (
    <div className="max-w-md mx-auto p-6 bg-white  rounded-2xl shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">โปรไฟล์ผู้ใช้</h2>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">รหัสบัตรประชาชน</label>
          <input
            type="text"
            value={profile.citizen_id || ""}
            onChange={(e) => setProfile({ ...profile, citizen_id: e.target.value })}
            className="w-full p-2 border rounded-lg "
            maxLength={13}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">ชื่อ - สกุล</label>
          <input
            type="text"
            value={profile.full_name || ""}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            className="w-full p-2 border rounded-lg "
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">เบอร์โทรศัพท์</label>
          <input
            type="text"
            value={profile.phone || ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="w-full p-2 border rounded-lg"
            maxLength={10}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึก"}
        </button>
      </form>

      {msg && <p className="text-center mt-3 text-sm">{msg}</p>}
    </div>
  );
}
