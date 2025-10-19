"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
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
      .from("prescriptions")
      .select(
        "id, patient_id, doctor_id, medication_name, dosage, instructions, attachments, prescribed_at"
      )
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

  async function addPrescription(e) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const patientId = e.target.patient_id.value;
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
          <input
            name="patient_id"
            placeholder="รหัสผู้ป่วย (UUID)"
            className="input"
            required
          />
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

      {loading ? (
        <div>⏳ กำลังโหลด...</div>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">วันที่สั่งยา</th>
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
                <td className="p-2 border">{p.medication_name}</td>
                <td className="p-2 border">{p.dosage}</td>
                <td className="p-2 border">{p.instructions || "-"}</td>
                <td className="p-2 border">
                  {p.attachments?.length
                    ? p.attachments.map((f) => (
                        <a
                          key={f}
                          href={`https://YOUR-PROJECT.supabase.co/storage/v1/object/public/prescription-files/${f}`}
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
