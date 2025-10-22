"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function DashboardHome() {
  const [user, setUser] = useState(null);
    const [healthStats, setHealthStats] = useState([]);
  
    /* ------------------------------
       ✅ โหลดข้อมูลผู้ใช้ + สุขภาพ
    ------------------------------ */
    useEffect(() => {
      async function loadData() {
        const {
          data: { user },
        } = await supabase.auth.getUser();
  
        if (!user) return;
  
        const { data: profile } = await supabase
          .from("users")
          .select("id, full_name, email, phone, avatar_url")
          .eq("id", user.id)
          .single();
  
        setUser(profile);
  
        const { data: records } = await supabase
          .from("health_tracking")
          .select("created_at, pulse, systolic, diastolic, spo2, temperature, summary")
          .order("created_at", { ascending: true })
          .limit(10);
  
        setHealthStats(records || []);
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
      abnormalCount === 0
        ? "สุขภาพดีมาก"
        : abnormalCount < 3
        ? "สุขภาพปกติ (มีบางค่าผิดปกติ)"
        : "ควรพบแพทย์เพื่อตรวจเพิ่มเติม";
  
    const summaryColor =
      abnormalCount === 0
        ? "#10B981"
        : abnormalCount < 3
        ? "#F59E0B"
        : "#EF4444";
  
    /* ------------------------------
       🎨 สี Pie Chart
    ------------------------------ */
    const COLORS = ["#10B981", "#F59E0B", "#EF4444"];
    const pieData = [
      { name: "ปกติ", value: healthStats.length - abnormalCount },
      { name: "ผิดปกติ", value: abnormalCount },
    ];
  
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold ">
          👤 โปรไฟล์ผู้ใช้ & สรุปสุขภาพ
        </h1>
  
        {/* ✅ ข้อมูลผู้ใช้ */}
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
          <div className="text-center space-y-3">
            <h2 className="text-lg font-semibold">สรุปสุขภาพโดยรวม</h2>
            <p
              className="text-xl font-bold"
              style={{ color: summaryColor }}
            >
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
                fill="#8884d8"
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
  
        {/* ✅ กราฟแนวโน้มสุขภาพ */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-3">
            📈 กราฟแนวโน้มสุขภาพล่าสุด
          </h2>
          {healthStats.length === 0 ? (
            <p className="text-gray-500 text-center">ไม่มีข้อมูลสุขภาพ</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={healthStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="created_at"
                  tickFormatter={(v) => dayjs(v).format("DD/MM")}
                />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="pulse"
                  stroke="#3b82f6"
                  name="ชีพจร (bpm)"
                />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke="#ef4444"
                  name="ความดันบน"
                />
                <Line
                  type="monotone"
                  dataKey="spo2"
                  stroke="#10b981"
                  name="SpO₂ (%)"
                />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f59e0b"
                  name="อุณหภูมิ (°C)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
  
        {/* ✅ ค่าเฉลี่ย */}
        <div className="card p-6 grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <h3 className="text-gray-500 text-sm">ชีพจรเฉลี่ย</h3>
            <p className="text-xl font-semibold">{avgPulse} bpm</p>
          </div>
          <div>
            <h3 className="text-gray-500 text-sm">ความดันเฉลี่ย</h3>
            <p className="text-xl font-semibold">{avgSystolic} mmHg</p>
          </div>
          <div>
            <h3 className="text-gray-500 text-sm">SpO₂ เฉลี่ย</h3>
            <p className="text-xl font-semibold">{avgSpO2}%</p>
          </div>
          <div>
            <h3 className="text-gray-500 text-sm">อุณหภูมิเฉลี่ย</h3>
            <p className="text-xl font-semibold">{avgTemp} °C</p>
          </div>
        </div>
      </div>
    );
  }