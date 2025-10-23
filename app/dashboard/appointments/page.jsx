"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState(null); // 👈 เพิ่มส่วนนี้

  // โหลดข้อมูลผู้ใช้
  async function getUserRole() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single();
    if (data) {
      setUserRole(
        data.role_id === 1
          ? "patient"
          : data.role_id === 2
          ? "doctor"
          : data.role_id === 3
          ? "admin"
          : null
      );
    }
  }

  async function fetchAppointments() {
    setLoading(true);

    // ดึง user ที่ล็อกอินอยู่
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // ดึง role ของผู้ใช้
    const { data: roleData } = await supabase
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single();

    const roleId = roleData?.role_id;

    let query = supabase
      .from("view_appointments_detail")
      .select(
        "id, appt_time, status, notes, doctor_name, patient_id, doctor_id, patient_name"
      )
      .order("appt_time", { ascending: false }); // 🔥 เรียงจากล่าสุดก่อน

    // 🔹 เงื่อนไขตาม role
    if (roleId === 1) {
      // ผู้ป่วย
      query = query.eq("patient_id", user.id);
    } else if (roleId === 2) {
      // แพทย์
      query = query.eq("doctor_id", user.id);
    } else if (roleId === 3) {
      // แอดมิน → ไม่กรองอะไร เห็นทั้งหมด
    }

    const { data, error } = await query;
    if (!error) setAppointments(data || []);
    setLoading(false);
  }

  useEffect(() => {
    getUserRole();
    fetchAppointments();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">นัดหมายแพทย์ (Appointments)</h1>

      {error && <div className="text-red-600">⚠️ {error}</div>}

      <NewAppointment onAdd={fetchAppointments} />

      {loading ? (
        <div>⏳ กำลังโหลด...</div>
      ) : appointments.length === 0 ? (
        <div className="text-gray-500">ยังไม่มีนัดหมาย</div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {/* สกอร์ลล์แนวนอนเมื่อจอแคบ */}
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">วันเวลา</th>
                  <th className="p-2 border">แพทย์</th>
                  <th className="p-2 border">ผู้ป่วย</th> {/* ✅ เพิ่ม */}
                  <th className="p-2 border">สถานะ</th>
                  <th className="p-2 border">หมายเหตุ</th>
                  <th className="p-2 border">ตอบรับ</th>
                  <th className="p-2 border">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <AppointmentRow
                    key={a.id}
                    appointment={a}
                    userRole={userRole}
                    onChange={fetchAppointments}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------
   เพิ่มนัดหมายใหม่
----------------------------------- */
function NewAppointment({ onAdd }) {
  const [hospitalList, setHospitalList] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [doctorList, setDoctorList] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // 🔹 โหลดรายชื่อโรงพยาบาลตอนเริ่มต้น
  useEffect(() => {
    async function fetchHospitals() {
      const { data, error } = await supabase
        .from("hospitals")
        .select("id, name")
        .order("name");
      if (!error) setHospitalList(data || []);
    }
    fetchHospitals();
  }, []);

  // 🔹 โหลดรายชื่อแพทย์ตามโรงพยาบาลที่เลือก
  useEffect(() => {
    async function fetchDoctorsByHospital() {
      if (!selectedHospital) {
        setDoctorList([]);
        setDoctorId("");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("hospital_id", selectedHospital)
        .eq("role_id", 2)
        .order("full_name");

      if (!error) setDoctorList(data || []);
    }

    fetchDoctorsByHospital();
  }, [selectedHospital]);

  // 🔹 เมื่อ submit ฟอร์ม
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMsg("❌ กรุณาเข้าสู่ระบบก่อน");
      setSaving(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single();

    const { error } = await supabase.from("appointments").insert({
      patient_id: user.id,
      doctor_id: doctorId,
      hospital_id: selectedHospital, // ✅ เพิ่มตรงนี้

      appt_time: time,
      notes,
    });

    if (error) setMsg("❌ " + error.message);
    else {
      setMsg("✅ เพิ่มนัดหมายสำเร็จ!");
      setSelectedHospital("");
      setDoctorList([]);
      setDoctorId("");
      setTime("");
      setNotes("");
      onAdd();
    }

    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="card space-y-3 max-w-md">
      <h2 className="text-lg font-semibold">เพิ่มนัดหมายใหม่</h2>

      {/* 🔹 เลือกโรงพยาบาล */}
      <div>
        <label className="label">เลือกโรงพยาบาล</label>
        <select
          className="input"
          value={selectedHospital}
          onChange={(e) => setSelectedHospital(e.target.value)}
          required
        >
          <option value="">-- เลือกโรงพยาบาล --</option>
          {hospitalList.map((hosp) => (
            <option key={hosp.id} value={hosp.id}>
              {hosp.name}
            </option>
          ))}
        </select>
      </div>

      {/* 🔹 เลือกแพทย์ */}
      <div>
        <label className="label">เลือกแพทย์</label>
        <select
          className="input"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          disabled={!selectedHospital}
          required
        >
          <option value="">-- เลือกแพทย์ --</option>
          {doctorList.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* 🔹 วันเวลา */}
      <div>
        <label className="label">วันเวลา</label>
        <input
          type="datetime-local"
          className="input"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
      </div>

      {/* 🔹 หมายเหตุ */}
      <div>
        <label className="label">หมายเหตุ</label>
        <textarea
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <button className="btn btn-primary w-full" disabled={saving}>
        {saving ? "กำลังบันทึก..." : "บันทึกนัดหมาย"}
      </button>
      {msg && <div className="text-sm text-center mt-2">{msg}</div>}
    </form>
  );
}

/* -----------------------------------
   แถวแสดงข้อมูลแต่ละนัด + ปุ่มแก้ไข/ยกเลิก
----------------------------------- */
function AppointmentRow({ appointment, userRole, onChange }) {
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState(appointment.appt_time);
  const [notes, setNotes] = useState(appointment.notes || "");
  const [saving, setSaving] = useState(false);

  async function updateAppointment() {
    setSaving(true);
    const { error } = await supabase
      .from("appointments")
      .update({ appt_time: time, notes })
      .eq("id", appointment.id);
    setSaving(false);
    if (!error) {
      setEditing(false);
      onChange();
    }
  }

  async function cancelAppointment() {
    if (!confirm("ต้องการยกเลิกนัดหมายนี้ใช่หรือไม่?")) return;
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointment.id);
    if (!error) onChange();
  }
  async function confirmAppointment() {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", appointment.id);
    if (!error) onChange();
  }

  return (
    <tr>
      <td className="border p-2">
        {editing ? (
          <input
            type="datetime-local"
            value={dayjs(time || new Date()).format("YYYY-MM-DDTHH:mm")}
            onChange={(e) => setTime(e.target.value)}
            className="input"
          />
        ) : appointment.appt_time ? (
          dayjs(appointment.appt_time).format("YYYY-MM-DD HH:mm")
        ) : (
          "-"
        )}
      </td>
      <td className="border p-2">{appointment.doctor_name || "—"}</td>
      <td className="border p-2">{appointment.patient_name || "—"}</td>{" "}
      {/* ✅ เพิ่ม */}
      <td className="border p-2">
        <span
          className={
            appointment.status === "cancelled"
              ? "text-red-500"
              : appointment.status === "confirmed"
              ? "text-green-600"
              : "text-gray-700"
          }
        >
          {appointment.status}
        </span>
      </td>
      <td className="border p-2">
        {editing ? (
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
          />
        ) : (
          appointment.notes || "-"
        )}
      </td>
      <td className="border p-2 text-center space-x-1">
        {/* ถ้าเป็นแพทย์ → แสดงปุ่มยืนยัน */}
        {(userRole === "doctor" || userRole === 2) &&
          appointment.status === "pending" && (
            <button
              onClick={confirmAppointment}
              className="btn btn-primary px-3 py-1 text-xs"
            >
              ✅ ยืนยันนัด
            </button>
          )}

        {/* ถ้าเป็นผู้ป่วย → แสดง "รอการตอบรับจากหมอ" */}
        {/* ถ้าไม่ใช่หมอ (เช่นผู้ป่วยหรือแอดมิน) → แสดงข้อความรอการตอบรับ */}
        {userRole !== "doctor" &&
          userRole !== 2 &&
          appointment.status === "pending" && (
            <span className="text-gray-500 text-sm">⌛ รอการตอบรับจากหมอ</span>
          )}

        {appointment.status === "confirmed" && (
          <span className="text-green-700 text-sm">✔️ ยืนยันแล้ว</span>
        )}
        {appointment.status === "cancelled" && (
          <span className="text-red-500 text-sm">❌ ถูกยกเลิก</span>
        )}
        {appointment.status === "completed" && (
          <span className="text-blue-700 text-sm">🏥 เสร็จสิ้น</span>
        )}
      </td>
      <td className="border p-2 text-center space-x-1">
        {editing ? (
          <>
            <button
              onClick={updateAppointment}
              disabled={saving}
              className="btn btn-primary px-3 py-1 text-xs"
            >
              💾 บันทึก
            </button>
            <button
              onClick={() => setEditing(false)}
              className="btn border px-3 py-1 text-xs"
            >
              ❌ ยกเลิก
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="btn border px-3 py-1 text-xs"
            >
              ✏️ แก้ไข
            </button>
            <button
              onClick={cancelAppointment}
              className="btn border px-3 py-1 text-xs text-red-600"
            >
              🗑️ ยกเลิกนัด
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
