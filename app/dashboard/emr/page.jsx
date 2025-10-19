"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";

export default function EMRPage() {
  const [records, setRecords] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fileList, setFileList] = useState([]);

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

    let query = supabase
      .from("medical_records")
      .select(
        "id, patient_id, doctor_id, visit_date, diagnosis, notes, attachments"
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        ระบบเวชระเบียนอิเล็กทรอนิกส์ (EMR)
      </h1>

      {/* ✅ ส่วนเพิ่มข้อมูลเฉพาะหมอ */}
      {userRole === 2 && (
        <form onSubmit={addRecord} className="card p-4 space-y-3">
          <h2 className="font-semibold text-lg">เพิ่มข้อมูลเวชระเบียน</h2>
          <input
            name="patient_id"
            placeholder="รหัสผู้ป่วย (UUID)"
            className="input"
            required
          />
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
              <th className="p-2 border">แพทย์</th>
              <th className="p-2 border">การวินิจฉัย</th>
              <th className="p-2 border">หมายเหตุ</th>
              <th className="p-2 border">ไฟล์แนบ</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td className="p-2 border">
                  {dayjs(r.visit_date).format("YYYY-MM-DD HH:mm")}
                </td>
                <td className="p-2 border">{r.doctor_id?.slice(0, 8)}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
