"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function HealthTrackingPage() {
  const [records, setRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    pulse: "",
    systolic: "",
    diastolic: "",
    temperature: "",
    spo2: "",
    steps: "",
  });
  const [analyze, setAnalyze] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  /* -----------------------------
     📌 โหลดข้อมูลผู้ใช้
  ----------------------------- */
  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) setUser(data.user);
    }
    getUser();
  }, []);

  /* -----------------------------
     📦 โหลดข้อมูลเฉพาะของ user นั้น
  ----------------------------- */
  async function loadRecords() {
    if (!user) return;
    const { data, error } = await supabase
      .from("health_tracking")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) setRecords(data || []);
  }

  useEffect(() => {
    loadRecords();
  }, [user]);

  /* -----------------------------
     🧠 วิเคราะห์สุขภาพ
  ----------------------------- */
  function analyzeHealth(values) {
    const { pulse, systolic, diastolic, temperature, spo2 } = values;
    const results = [];
    let abnormal = 0;

    if (pulse < 60) results.push(`🟡 ชีพจร ${pulse} bpm → ต่ำ (หัวใจเต้นช้า)`);
    else if (pulse > 100)
      results.push(`🔴 ชีพจร ${pulse} bpm → สูง (หัวใจเต้นเร็ว)`);
    else results.push(`🟢 ชีพจร ${pulse} bpm → ปกติ (60–100 bpm)`);
    if (pulse < 60 || pulse > 100) abnormal++;

    if (systolic > 140 || diastolic > 90)
      results.push(`🔴 ความดัน ${systolic}/${diastolic} → สูง`);
    else if (systolic < 90 || diastolic < 60)
      results.push(`🟡 ความดัน ${systolic}/${diastolic} → ต่ำ`);
    else results.push(`🟢 ความดัน ${systolic}/${diastolic} → ปกติ`);
    if (systolic > 140 || diastolic > 90 || systolic < 90 || diastolic < 60)
      abnormal++;

    if (temperature > 37.5)
      results.push(`🔴 อุณหภูมิ ${temperature}°C → สูง (อาจมีไข้)`);
    else if (temperature < 36.0)
      results.push(`🟡 อุณหภูมิ ${temperature}°C → ต่ำ (ร่างกายเย็น)`);
    else results.push(`🟢 อุณหภูมิ ${temperature}°C → ปกติ (36.0–37.5°C)`);
    if (temperature > 37.5 || temperature < 36.0) abnormal++;

    if (spo2 < 95) results.push(`🔴 ค่า SpO₂ ${spo2}% → ต่ำ (อาจขาดออกซิเจน)`);
    else results.push(`🟢 ค่า SpO₂ ${spo2}% → ปกติ (≥95%)`);
    if (spo2 < 95) abnormal++;

    let summary = "";
    if (abnormal === 0) summary = "✅ สุขภาพปกติ";
    else if (abnormal <= 2) summary = "⚠️ มีบางค่าผิดปกติ";
    else summary = "❌ สุขภาพผิดปกติหลายค่า";

    return { results, summary };
  }

  /* -----------------------------
     💾 บันทึกข้อมูล (ของ user คนนั้น)
  ----------------------------- */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return alert("กรุณาเข้าสู่ระบบก่อน");

    const result = analyzeHealth(form);
    setAnalyze(result);

    const { error } = await supabase.from("health_tracking").insert({
      user_id: user.id, // 👈 ผูกกับผู้ใช้
      pulse: Number(form.pulse),
      systolic: Number(form.systolic),
      diastolic: Number(form.diastolic),
      temperature: Number(form.temperature),
      spo2: Number(form.spo2),
      steps: Number(form.steps),
      summary: result.summary,
      details: result.results.join("\n"),
      created_at: new Date(),
    });

    if (error) alert("❌ บันทึกไม่สำเร็จ: " + error.message);
    else {
      alert("✅ บันทึกข้อมูลเรียบร้อย");
      setForm({
        pulse: "",
        systolic: "",
        diastolic: "",
        temperature: "",
        spo2: "",
        steps: "",
      });
      loadRecords();
    }
  }

  /* -----------------------------
     🔍 ตรวจค่าว่าผิดปกติไหม (ใช้สำหรับแสดงสีแดง)
  ----------------------------- */
  function isAbnormal(field, value, record) {
    switch (field) {
      case "pulse":
        return value < 60 || value > 100;
      case "systolic":
      case "diastolic":
        return (
          record.systolic > 140 ||
          record.diastolic > 90 ||
          record.systolic < 90 ||
          record.diastolic < 60
        );
      case "temperature":
        return value > 37.5 || value < 36.0;
      case "spo2":
        return value < 95;
      default:
        return false;
    }
  }

  /* -----------------------------
     🖼️ ส่วนแสดงผลหลัก
  ----------------------------- */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        🩺 การติดตามสุขภาพผ่านอุปกรณ์สวมใส่
      </h1>

      {/* ✅ ฟอร์มบันทึกข้อมูล */}
      <form
        onSubmit={handleSubmit}
        className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 bg-white shadow-md p-6 rounded-lg"
      >
        <input
          className="input"
          type="number"
          placeholder="ชีพจร (bpm)"
          value={form.pulse}
          onChange={(e) => setForm({ ...form, pulse: e.target.value })}
          required
        />
        <input
          className="input"
          type="number"
          placeholder="ความดันบน (systolic)"
          value={form.systolic}
          onChange={(e) => setForm({ ...form, systolic: e.target.value })}
          required
        />
        <input
          className="input"
          type="number"
          placeholder="ความดันล่าง (diastolic)"
          value={form.diastolic}
          onChange={(e) => setForm({ ...form, diastolic: e.target.value })}
          required
        />
        <input
          className="input"
          type="number"
          placeholder="อุณหภูมิร่างกาย (°C)"
          value={form.temperature}
          onChange={(e) => setForm({ ...form, temperature: e.target.value })}
          required
        />
        <input
          className="input"
          type="number"
          placeholder="ค่า SpO₂ (%)"
          value={form.spo2}
          onChange={(e) => setForm({ ...form, spo2: e.target.value })}
          required
        />
        <input
          className="input"
          type="number"
          placeholder="จำนวนก้าว (steps)"
          value={form.steps}
          onChange={(e) => setForm({ ...form, steps: e.target.value })}
        />
        <button className="btn btn-primary col-span-full">
          💾 บันทึกข้อมูล
        </button>
      </form>

      {/* ✅ ตารางประวัติสุขภาพ */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">
          📈 ประวัติการติดตามสุขภาพ
        </h2>
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">วันที่</th>
              <th className="p-2 border">ชีพจร</th>
              <th className="p-2 border">ความดัน (บน/ล่าง)</th>
              <th className="p-2 border">อุณหภูมิ</th>
              <th className="p-2 border">SpO₂</th>
              <th className="p-2 border">ก้าว</th>
              <th className="p-2 border">ผลการวิเคราะห์</th>
              <th className="p-2 border text-center">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td className="border p-2">
                  {dayjs(r.created_at).format("DD/MM/YYYY HH:mm")}
                </td>
                <td
                  className={`border p-2 text-center ${
                    isAbnormal("pulse", r.pulse, r)
                      ? "text-red-600 font-bold"
                      : ""
                  }`}
                >
                  {r.pulse}
                </td>
                <td
                  className={`border p-2 text-center ${
                    isAbnormal("systolic", r.systolic, r)
                      ? "text-red-600 font-bold"
                      : ""
                  }`}
                >
                  {r.systolic}/{r.diastolic}
                </td>
                <td
                  className={`border p-2 text-center ${
                    isAbnormal("temperature", r.temperature, r)
                      ? "text-red-600 font-bold"
                      : ""
                  }`}
                >
                  {r.temperature}
                </td>
                <td
                  className={`border p-2 text-center ${
                    isAbnormal("spo2", r.spo2, r)
                      ? "text-red-600 font-bold"
                      : ""
                  }`}
                >
                  {r.spo2}
                </td>
                <td className="border p-2 text-center">{r.steps}</td>
                <td
                  className={`border p-2 text-center font-semibold ${
                    r.summary?.includes("✅")
                      ? "text-green-600"
                      : r.summary?.includes("⚠️")
                      ? "text-yellow-500"
                      : "text-red-600"
                  }`}
                >
                  {r.summary || "-"}
                </td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => setSelectedRecord(r)}
                    className="text-blue-600 hover:underline"
                  >
                    🔍 ดู
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center p-3 text-gray-500">
                  ไม่มีข้อมูลสุขภาพ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Modal แสดงรายละเอียด */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-[90%] max-w-lg">
            <h3 className="text-xl font-semibold mb-3 text-center">
              🔍 รายละเอียดผลวิเคราะห์สุขภาพย้อนหลัง
            </h3>
            <p className="text-gray-600 mb-2 text-center">
              {dayjs(selectedRecord.created_at).format("DD/MM/YYYY HH:mm")}
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 mb-3">
              {(selectedRecord.details || "")
                .split("\n")
                .filter(Boolean)
                .map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
            </ul>
            <p className="font-semibold text-center">
              สรุป: {selectedRecord.summary}
            </p>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn border px-4 py-2"
              >
                ❌ ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ กราฟแนวโน้มสุขภาพ */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">📉 กราฟแนวโน้มสุขภาพ</h2>
        {records.length === 0 ? (
          <p className="text-gray-500 text-center p-3">ไม่มีข้อมูลแสดงกราฟ</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={records.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="created_at"
                tickFormatter={(val) => dayjs(val).format("DD/MM")}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="pulse"
                stroke="#4f46e5"
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
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ✅ กราฟจำนวนก้าว */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">🏃‍♂️ กราฟจำนวนก้าวต่อวัน</h2>
        {records.length === 0 ? (
          <p className="text-gray-500 text-center p-3">ไม่มีข้อมูลแสดงกราฟ</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={records.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="created_at"
                tickFormatter={(val) => dayjs(val).format("DD/MM")}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="steps"
                fill="#3b82f6"
                name="จำนวนก้าว (steps)"
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
