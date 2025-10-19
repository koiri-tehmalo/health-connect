"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";

export default function EMRPage() {
  const [records, setRecords] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileList, setFileList] = useState([]);
  const [patients, setPatients] = useState([]); // ✅ รายชื่อผู้ป่วยที่นัดกับหมอ

  // -----------------------------
  // โหลดข้อมูลทั้งหมด
  // -----------------------------
  async function fetchData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // ✅ ตรวจสอบ role ของผู้ใช้
    const { data: roleData } = await supabase
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single();

    const roleId = roleData?.role_id;
    setUserRole(roleId);

    if (roleId === 2) {
      // ✅ ดึงรายชื่อผู้ป่วยทั้งหมดที่นัดกับหมอ
      const { data: appointments } = await supabase
        .from("appointments")
        .select("patient_id, patients:patient_id (id, full_name)")
        .eq("doctor_id", user.id)
        .neq("status", "cancelled");

      // ✅ ดึงรายชื่อผู้ป่วยที่ "เคยมีเวชระเบียนแล้ว"
      const { data: existingRecords } = await supabase
        .from("medical_records")
        .select("patient_id")
        .eq("doctor_id", user.id);

      const alreadyAdded = new Set(
        (existingRecords || []).map((r) => r.patient_id)
      );

      // ✅ กรองเอาเฉพาะผู้ป่วยที่ยังไม่มีเวชระเบียน
      const filteredPatients =
        appointments?.filter((a) => !alreadyAdded.has(a.patient_id)) || [];

      // ✅ รวมชื่อไม่ซ้ำ
      const uniquePatients = [];
      const seen = new Set();
      for (const a of filteredPatients) {
        const p = a.patients;
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          uniquePatients.push(p);
        }
      }

      setPatients(uniquePatients);
    }

    // ✅ ดึงเวชระเบียนตาม role
    let query = supabase
      .from("medical_records")
      .select(
        "id, patient_id, doctor_id, visit_date, diagnosis, notes, attachments, patients:patient_id (id, full_name), doctors:doctor_id (id, full_name)"
      )
      .order("visit_date", { ascending: false });

    if (roleId === 1) query = query.eq("patient_id", user.id);
    if (roleId === 2) query = query.eq("doctor_id", user.id);

    const { data, error } = await query;
    if (!error) setRecords(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // -----------------------------
  // Upload file
  // -----------------------------
  async function uploadFiles(e) {
    const files = e.target.files;
    const uploadedUrls = [];
    for (const file of files) {
      const { data, error } = await supabase.storage
        .from("emr-files")
        .upload(`${Date.now()}-${file.name}`, file);
      if (!error) uploadedUrls.push(data.path);
    }
    setFileList(uploadedUrls);
  }

  // -----------------------------
  // เพิ่มเวชระเบียน
  // -----------------------------
  async function addRecord(e) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patientId = e.target.patient_id.value;
    const diagnosis = e.target.diagnosis.value;
    const notes = e.target.notes.value;

    const { error } = await supabase.from("medical_records").insert({
      doctor_id: user.id,
      patient_id: patientId,
      diagnosis,
      notes,
      attachments: fileList,
    });

    if (!error) {
      alert("✅ บันทึกเวชระเบียนสำเร็จ");
      fetchData();
      e.target.reset();
      setFileList([]);
    } else {
      alert("❌ " + error.message);
    }
  }

  // -----------------------------
  // ส่วนแสดงผล
  // -----------------------------
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        ระบบเวชระเบียนอิเล็กทรอนิกส์ (EMR)
      </h1>

      {/* ✅ ส่วนเพิ่มข้อมูลเฉพาะหมอ */}
      {userRole === 2 && (
        <form onSubmit={addRecord} className="card p-4 space-y-3">
          <h2 className="font-semibold text-lg">เพิ่มข้อมูลเวชระเบียน</h2>

          {/* 🔽 Dropdown รายชื่อผู้ป่วย */}
          <select name="patient_id" className="input" required>
            <option value="">-- เลือกผู้ป่วยที่นัดหมาย --</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.id.slice(0, 8)}
              </option>
            ))}
          </select>

          <textarea
            name="diagnosis"
            placeholder="การวินิจฉัย"
            className="input"
            required
          />
          <textarea
            name="notes"
            placeholder="หมายเหตุเพิ่มเติม"
            className="input"
          />
          <input
            type="file"
            multiple
            onChange={uploadFiles}
            className="input"
          />
          <button className="btn btn-primary w-full">บันทึกข้อมูล</button>
        </form>
      )}

      {loading ? (
        <div>⏳ กำลังโหลด...</div>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">วันที่</th>
              <th className="p-2 border">ผู้ป่วย</th>
              <th className="p-2 border">แพทย์</th>
              <th className="p-2 border">การวินิจฉัย</th>
              <th className="p-2 border">หมายเหตุ</th>
              <th className="p-2 border">ไฟล์แนบ</th>
              {userRole === 2 && <th className="p-2 border">จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td className="p-2 border">
                  {dayjs(r.visit_date).format("YYYY-MM-DD HH:mm")}
                </td>
                <td className="p-2 border">
                  {r.patients?.full_name || r.patient_id?.slice(0, 8)}
                </td>
                <td className="p-2 border">
                  {r.doctors?.full_name || r.doctor_id?.slice(0, 8)}
                </td>
                <td className="p-2 border">{r.diagnosis}</td>
                <td className="p-2 border">{r.notes || "-"}</td>
                <td className="p-2 border">
                  {r.attachments?.length
                    ? r.attachments.map((f) => (
                        <a
                          key={f}
                          href={`https://rqgsuyrchstpfnjygsmf.supabase.co/storage/v1/object/public/emr-files/${f}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline block"
                        >
                          {f.split("/").pop()}
                        </a>
                      ))
                    : "-"}
                </td>

                {userRole === 2 && (
                  <td className="p-2 border text-center">
                    <button
                      onClick={() =>
                        (window.location.href = `/dashboard/prescriptions?patient_id=${r.patient_id}`)
                      }
                      className="btn btn-primary text-xs px-3 py-1"
                    >
                      💊 สร้างใบสั่งยา
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
