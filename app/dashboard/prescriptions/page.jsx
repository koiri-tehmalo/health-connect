"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";
import { useSearchParams } from "next/navigation";

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileList, setFileList] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null); // ✅ เก็บชื่อผู้ป่วย
  const searchParams = useSearchParams();
  const prefilledPatient = searchParams.get("patient_id") || "";

  // ✅ โหลดข้อมูลผู้ใช้และ prescription
  async function fetchData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single();

    const roleId = roleData?.role_id;
    setUserRole(roleId);

    // ✅ ดึงชื่อผู้ป่วยจาก patient_id (ถ้ามีส่งมา)
    if (prefilledPatient) {
      const { data: patient } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", prefilledPatient)
        .single();
      if (patient) setPatientInfo(patient);
    }

    // ✅ ดึงใบสั่งยาทั้งหมดตาม role
    let query = supabase
      .from("view_prescriptions_with_users")
      .select("*")
      .order("prescribed_at", { ascending: false });

    if (roleId === 1) query = query.eq("patient_id", user.id);
    if (roleId === 2) query = query.eq("doctor_id", user.id);

    const { data, error } = await query;
    if (!error) setPrescriptions(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ upload file
  async function uploadFiles(e) {
    const files = e.target.files;
    const uploaded = [];
    for (const file of files) {
      const { data, error } = await supabase.storage
        .from("prescription-files")
        .upload(`${Date.now()}-${file.name}`, file);
      if (!error) uploaded.push(data.path);
    }
    setFileList(uploaded);
  }

  // ✅ เพิ่มใบสั่งยาใหม่
  async function addPrescription(e) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patientId = prefilledPatient || e.target.patient_id.value; // ใช้จาก URL ถ้ามี
    const medication_name = e.target.medication_name.value;
    const dosage = e.target.dosage.value;
    const instructions = e.target.instructions.value;

    const { error } = await supabase.from("prescriptions").insert({
      doctor_id: user.id,
      patient_id: patientId,
      medication_name,
      dosage,
      instructions,
      attachments: fileList,
    });

    if (!error) {
      alert("✅ เพิ่มใบสั่งยาเรียบร้อย");
      fetchData();
      e.target.reset();
      setFileList([]);
    } else {
      alert("❌ " + error.message);
    }
  }

  // ✅ UI
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">ระบบใบสั่งยา (Prescriptions)</h1>

      {/* ✅ หมอสามารถเพิ่มใบสั่งยา */}
      {userRole === 2 && (
        <form
          onSubmit={addPrescription}
          className="card p-4 space-y-3 max-w-md"
        >
          <h2 className="font-semibold text-lg">เพิ่มใบสั่งยา</h2>

          {/* ✅ ช่องชื่อผู้ป่วย */}
          {prefilledPatient ? (
            <div>
              <label className="block text-sm font-medium mb-1">ผู้ป่วย:</label>
              <input
                type="text"
                value={patientInfo?.full_name || "กำลังโหลด..."}
                disabled
                className="input bg-gray-100"
              />
            </div>
          ) : (
            <input
              name="patient_id"
              placeholder="รหัสผู้ป่วย (UUID)"
              className="input"
              required
            />
          )}

          <input
            name="medication_name"
            placeholder="ชื่อยา"
            className="input"
            required
          />
          <input
            name="dosage"
            placeholder="ปริมาณยา / ขนาดยา"
            className="input"
            required
          />
          <textarea
            name="instructions"
            placeholder="คำแนะนำ"
            className="input"
          />
          <input
            type="file"
            multiple
            onChange={uploadFiles}
            className="input"
          />
          <button className="btn btn-primary w-full">บันทึก</button>
        </form>
      )}

      {/* ✅ ตารางแสดงข้อมูลใบสั่งยา */}
      {loading ? (
        <div>⏳ กำลังโหลด...</div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border rounded-md">
          🩺 ไม่มีข้อมูลใบสั่งยาของคุณ
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {/* สกอร์ลล์แนวนอนเมื่อจอแคบ */}
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">วันที่สั่งยา</th>
                  <th className="p-2 border">ผู้ป่วย</th>
                  <th className="p-2 border">แพทย์</th>
                  <th className="p-2 border">ชื่อยา</th>
                  <th className="p-2 border">ปริมาณ</th>
                  <th className="p-2 border">คำแนะนำ</th>
                  <th className="p-2 border">ไฟล์แนบ</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2 border">
                      {dayjs(p.prescribed_at).format("YYYY-MM-DD HH:mm")}
                    </td>
                    <td className="p-2 border">
                      {p.patient_name || p.patient_id?.slice(0, 8)}
                    </td>
                    <td className="p-2 border">
                      {p.doctor_name || p.doctor_id?.slice(0, 8)}
                    </td>
                    <td className="p-2 border">{p.medication_name}</td>
                    <td className="p-2 border">{p.dosage}</td>
                    <td className="p-2 border">{p.instructions || "-"}</td>
                    <td className="p-2 border">
                      {p.attachments?.length
                        ? p.attachments.map((f) => (
                            <a
                              key={f}
                              href={`https://rqgsuyrchstpfnjygsmf.supabase.co/storage/v1/object/public/prescription-files/${f}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline block"
                            >
                              {f.split("/").pop()}
                            </a>
                          ))
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
