"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";

export default function DashboardHome() {
  const [user, setUser] = useState(null);
  const [healthStats, setHealthStats] = useState([]);
  const [appointments, setAppointments] = useState([]); // ✅ เพิ่มนัดหมาย

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ------------------------------
     ✅ โหลดข้อมูลผู้ใช้ + สุขภาพ + ยาที่ถูกสั่ง
  ------------------------------ */
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // ดึงข้อมูลโปรไฟล์
      const { data: profile } = await supabase
        .from("users")
        .select("id, full_name, email, phone, avatar_url")
        .eq("id", user.id)
        .single();

      setUser(profile);

      // ✅ ดึงข้อมูลสุขภาพ
      const { data: records } = await supabase
        .from("health_tracking")
        .select(
          "created_at, pulse, systolic, diastolic, spo2, temperature, summary"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(10);

      setHealthStats(records || []);

      // ✅ ดึงข้อมูลยาที่สั่งให้คนนี้กิน
      const { data: meds } = await supabase
        .from("prescriptions")
        .select(
          "id, medication_name, dosage, instructions, prescribed_at, doctors:doctor_id(full_name)"
        )
        .eq("patient_id", user.id)
        .order("prescribed_at", { ascending: false })
        .limit(5); // เอามาแค่ล่าสุด 5 รายการ

      setPrescriptions(meds || []);
      // ✅ ข้อมูลนัดหมายภายใน 3 วัน
      const today = dayjs().startOf("day").toISOString();
      const threeDaysLater = dayjs().add(3, "day").endOf("day").toISOString();

      const { data: appts, error } = await supabase
        .from("appointments")
        .select("id, appt_time, doctor_id, notes, doctors:doctor_id(full_name)")
        .eq("patient_id", user.id)
        .gte("appt_time", today)
        .lte("appt_time", threeDaysLater)
        .order("appt_time", { ascending: true })
        .limit(3);

      if (error) console.error("โหลดนัดหมายผิดพลาด:", error.message);
      setAppointments(appts || []);
      setLoading(false);
    }

    loadData();
  }, []);

  /* ------------------------------
     🧠 วิเคราะห์สุขภาพรวม
  ------------------------------ */
  const avg = (key) =>
    healthStats.length > 0
      ? (
          healthStats.reduce((sum, r) => sum + (r[key] || 0), 0) /
          healthStats.length
        ).toFixed(1)
      : 0;
  const avgPulse = avg("pulse");
  const avgSystolic = avg("systolic");
  const avgSpO2 = avg("spo2");
  const avgTemp = avg("temperature");
  const abnormalCount = healthStats.filter(
    (r) => r.summary && !r.summary.includes("ปกติ")
  ).length;

  const healthSummary =
    healthStats.length === 0
      ? "ยังไม่มีข้อมูลสุขภาพ"
      : abnormalCount === 0
      ? "สุขภาพดีมาก"
      : abnormalCount < 3
      ? "สุขภาพปกติ (มีบางค่าผิดปกติ)"
      : "ควรพบแพทย์เพื่อตรวจเพิ่มเติม";

  const summaryColor =
    healthStats.length === 0
      ? "#9CA3AF"
      : abnormalCount === 0
      ? "#10B981"
      : abnormalCount < 3
      ? "#F59E0B"
      : "#EF4444";

  const COLORS = ["#10B981", "#F59E0B", "#EF4444"];
  const pieData =
    healthStats.length === 0
      ? []
      : [
          { name: "ปกติ", value: healthStats.length - abnormalCount },
          { name: "ผิดปกติ", value: abnormalCount },
        ];

  /* ------------------------------
     🧭 ส่วนแสดงผล
  ------------------------------ */
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">👤 โปรไฟล์ผู้ใช้ & สรุปสุขภาพ</h1>
      {/* ✅ โปรไฟล์ */}
      {user && (
        <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-6 flex flex-col sm:flex-row gap-6 items-center backdrop-blur-md">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 p-[3px]">
              <div className="w-full h-full bg-white dark:bg-gray-900 rounded-full flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <p className="text-lg font-semibold">{user.full_name}</p>
            <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            <p className="text-gray-600 dark:text-gray-400">
              {user.phone || "-"}
            </p>
            <button className="mt-3 px-4 py-2 bg-gradient-to-r from-sky-500 to-emerald-400 text-white rounded-lg shadow hover:opacity-90">
              ✏️ แก้ไขข้อมูลส่วนตัว
            </button>
          </div>
        </div>
      )}
      {/* ✅ วงกลมสรุปสุขภาพ */}
      <div className="card flex flex-col md:flex-row items-center justify-center gap-8 p-6">
        {loading ? (
          <p className="text-gray-500 text-center">กำลังโหลดข้อมูล...</p>
        ) : (
          <>
            <div className="text-center space-y-3">
              <h2 className="text-lg font-semibold">สรุปสุขภาพโดยรวม</h2>
              <p className="text-xl font-bold" style={{ color: summaryColor }}>
                {healthSummary}
              </p>
              <p className="text-sm text-gray-500">
                วิเคราะห์จากข้อมูลสุขภาพล่าสุด {healthStats.length} ครั้ง
              </p>
            </div>

            <ResponsiveContainer width={260} height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
      {/* ✅ รายการยาที่ถูกสั่งให้กิน */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-3">
          💊 ยาที่ถูกสั่งให้กินล่าสุด
        </h2>
        {loading ? (
          <p className="text-gray-500 text-center">⏳ กำลังโหลดข้อมูล...</p>
        ) : prescriptions.length === 0 ? (
          <p className="text-gray-500 text-center">
            🩺 ยังไม่มีข้อมูลใบสั่งยาจากแพทย์
          </p>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">วันที่สั่ง</th>
                <th className="p-2 border">ชื่อยา</th>
                <th className="p-2 border">ขนาดยา</th>
                <th className="p-2 border">คำแนะนำ</th>
                <th className="p-2 border">แพทย์ผู้สั่ง</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 border">
                    {dayjs(p.prescribed_at).format("DD/MM/YYYY")}
                  </td>
                  <td className="p-2 border">{p.medication_name}</td>
                  <td className="p-2 border">{p.dosage}</td>
                  <td className="p-2 border">{p.instructions || "-"}</td>
                  <td className="p-2 border">{p.doctors?.full_name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* ✅ นัดหมายภายใน 3 วัน */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-3">
          📅 นัดหมายแพทย์ใน 3 วันข้างหน้า
        </h2>
        {loading ? (
          <p className="text-gray-500 text-center">⏳ กำลังโหลดข้อมูล...</p>
        ) : appointments.length === 0 ? (
          <p className="text-gray-500 text-center">
            📭 ยังไม่มีนัดหมายภายใน 3 วันข้างหน้า
          </p>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">วันที่</th>
                <th className="p-2 border">เวลา</th>
                <th className="p-2 border">แพทย์</th>
                <th className="p-2 border">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td className="p-2 border">
                    {dayjs(a.appointment_time).format("DD/MM/YYYY")}
                  </td>
                  <td className="p-2 border">
                    {dayjs(a.appointment_time).format("HH:mm")}
                  </td>
                  <td className="p-2 border">{a.doctors?.full_name || "-"}</td>
                  <td className="p-2 border">{a.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* ✅ ค่าเฉลี่ย */}{" "}
      <div className="card p-6 grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {" "}
        {healthStats.length === 0 ? (
          <p className="col-span-full text-gray-500 text-center">
            {" "}
            📉 ยังไม่มีข้อมูลสำหรับคำนวณค่าเฉลี่ย{" "}
          </p>
        ) : (
          <>
            {" "}
            <div>
              {" "}
              <h3 className="text-gray-500 text-sm">ชีพจรเฉลี่ย</h3>{" "}
              <p className="text-xl font-semibold">{avgPulse} bpm</p>{" "}
            </div>{" "}
            <div>
              {" "}
              <h3 className="text-gray-500 text-sm">ความดันเฉลี่ย</h3>{" "}
              <p className="text-xl font-semibold">{avgSystolic} mmHg</p>{" "}
            </div>{" "}
            <div>
              {" "}
              <h3 className="text-gray-500 text-sm">SpO₂ เฉลี่ย</h3>{" "}
              <p className="text-xl font-semibold">{avgSpO2}%</p>{" "}
            </div>{" "}
            <div>
              {" "}
              <h3 className="text-gray-500 text-sm">อุณหภูมิเฉลี่ย</h3>{" "}
              <p className="text-xl font-semibold">{avgTemp} °C</p>{" "}
            </div>{" "}
          </>
        )}{" "}
      </div>
    </div>
  );
}
