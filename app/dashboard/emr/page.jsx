"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";

export default function EMRPage() {
  const [records, setRecords] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileList, setFileList] = useState([]);
  const [patients, setPatients] = useState([]);

  // -----------------------------
  // โหลดข้อมูลทั้งหมด
  // -----------------------------
  async function fetchData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // ✅ ดึง role ของผู้ใช้
    const { data: roleData } = await supabase
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single();

    const roleId = roleData?.role_id;
    setUserRole(roleId);

    // ✅ ถ้าเป็นหมอ → ดึงรายชื่อผู้ป่วยที่นัดกับหมอจาก view
    if (roleId === 2) {
      const { data: appointments } = await supabase
        .from("view_doctor_patient_appointments")
        .select("patient_id, patient_name, status")
        .eq("doctor_id", user.id)
        .neq("status", "cancelled");

      // ✅ รวมชื่อไม่ซ้ำจาก view (ไม่กรองออกผู้ป่วยเดิม)
      const uniquePatients = [];
      const seen = new Set();
      for (const a of appointments || []) {
        if (a.patient_id && !seen.has(a.patient_id)) {
          seen.add(a.patient_id);
          uniquePatients.push({
            id: a.patient_id,
            full_name: a.patient_name,
          });
        }
      }
      setPatients(uniquePatients);
    }

    // ✅ ดึงเวชระเบียนทั้งหมด (join ด้วย foreign key เดิม)
    let query = supabase
      .from("medical_records")
      .select(
        `
        id,
        patient_id,
        doctor_id,
        visit_date,
        diagnosis,
        notes,
        attachments,
        patients:patient_id (id, full_name),
        doctors:doctor_id (id, full_name)
      `
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
      ) : !records || records.length === 0 ? (
        <div className="text-gray-500">ไม่มีข้อมูลเวชระเบียน</div>
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
