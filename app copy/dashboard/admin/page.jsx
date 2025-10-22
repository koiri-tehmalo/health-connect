"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPage() {
  const [stats, setStats] = useState({});
  const [role, setRole] = useState(null);

  async function checkRole() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single();

    setRole(data?.role_id || null);
  }

  async function fetchStats() {
    const [usersRes, doctorsRes, apptRes, hospitalsRes] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role_id", 2),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true }),
      supabase.from("hospitals").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      users: usersRes.count || 0,
      doctors: doctorsRes.count || 0,
      appointments: apptRes.count || 0,
      hospitals: hospitalsRes.count || 0,
    });
  }

  useEffect(() => {
    checkRole();
    fetchStats();
  }, []);

  if (role !== 3) {
    return (
      <div className="text-center mt-10 text-gray-500">
        ❌ คุณไม่มีสิทธิ์เข้าหน้านี้ (เฉพาะแอดมิน)
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <h2 className="text-lg font-semibold">👥 ผู้ใช้ทั้งหมด</h2>
          <p>{stats.users}</p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold">🩺 แพทย์</h2>
          <p>{stats.doctors}</p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold">📅 นัดหมาย</h2>
          <p>{stats.appointments}</p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold">🏥 โรงพยาบาล</h2>
          <p>{stats.hospitals}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <UsersTable />
        <HospitalsTable />
      </div>
    </div>
  );
}

/* -------------------------------------
   ตารางผู้ใช้
------------------------------------- */
function UsersTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role_id: 1,
  });

  async function loadUsers() {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, role_id, phone, created_at")
      .order("created_at", { ascending: false });
    if (!error) setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleDelete(id) {
    // ตรวจว่ามีนัดหมายอยู่หรือไม่ (ทั้ง patient และ doctor)
    const { count, error: countError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true }) // ✅ ต้องมี count:'exact'
      .or(`patient_id.eq.${id},doctor_id.eq.${id}`);

    if (countError) {
      alert("⚠️ ตรวจสอบนัดหมายไม่สำเร็จ: " + countError.message);
      return;
    }

    if (count > 0) {
      alert("❌ ผู้ใช้นี้ยังมีนัดหมายอยู่ กรุณาลบนัดหมายก่อน");
      return;
    }

    // ถ้าไม่มีนัดแล้ว ค่อยลบผู้ใช้
    if (!confirm("ต้องการลบผู้ใช้นี้ใช่หรือไม่?")) return;

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      alert("❌ ลบไม่สำเร็จ: " + error.message);
    } else {
      alert("✅ ลบผู้ใช้เรียบร้อย");
      loadUsers();
    }
  }

  function openEdit(user) {
    setEditingUser(user);
    setForm({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || "",
      role_id: user.role_id,
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    const { error } = await supabase
      .from("users")
      .update({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role_id: form.role_id,
      })
      .eq("id", editingUser.id);

    if (error) alert("❌ แก้ไขไม่สำเร็จ: " + error.message);
    else {
      alert("✅ บันทึกเรียบร้อย");
      setEditingUser(null);
      loadUsers();
    }
  }

  return (
    <div className="card relative">
      <h2 className="text-lg font-semibold mb-3">👥 รายชื่อผู้ใช้ทั้งหมด</h2>

      {loading ? (
        <div>⏳ กำลังโหลด...</div>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">ชื่อ</th>
              <th className="p-2 border">อีเมล</th>
              <th className="p-2 border">เบอร์โทร</th>
              <th className="p-2 border">Role</th>
              <th className="p-2 border">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="border p-2">{u.full_name}</td>
                <td className="border p-2">{u.email}</td>
                <td className="border p-2">{u.phone || "-"}</td>
                <td className="border p-2">{roleLabel(u.role_id)}</td>
                <td className="border p-2 text-center space-x-1">
                  <button
                    onClick={() => openEdit(u)}
                    className="btn border text-xs px-3 py-1"
                  >
                    ✏️ แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="btn border text-xs px-3 py-1 text-red-600"
                  >
                    🗑️ ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <form
            onSubmit={saveEdit}
            className="bg-white rounded-xl shadow-xl p-6 w-[90%] max-w-md space-y-3"
          >
            <h3 className="text-xl font-semibold mb-2">แก้ไขผู้ใช้</h3>

            <div>
              <label className="label">ชื่อ-นามสกุล</label>
              <input
                className="input"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">อีเมล</label>
              <input
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">เบอร์โทร</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={form.role_id}
                onChange={(e) =>
                  setForm({ ...form, role_id: Number(e.target.value) })
                }
              >
                <option value={1}>Patient</option>
                <option value={2}>Doctor</option>
                <option value={3}>Admin</option>
                <option value={4}>Pharmacy</option>
                <option value={5}>Staff</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="btn border"
              >
                ❌ ยกเลิก
              </button>
              <button type="submit" className="btn btn-primary">
                💾 บันทึก
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function roleLabel(id) {
  switch (id) {
    case 1:
      return "Patient";
    case 2:
      return "Doctor";
    case 3:
      return "Admin";
    case 4:
      return "Pharmacy";
    default:
      return "Staff";
  }
}

/* -------------------------------------
   ตารางโรงพยาบาล
------------------------------------- */
function HospitalsTable() {
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("hospitals")
      .select("*")
      .order("id");
    if (!error) setList(data || []);
  }

  async function addHospital(e) {
    e.preventDefault();
    if (!name) return;
    await supabase.from("hospitals").insert({ name, address });
    setName("");
    setAddress("");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-3">🏥 โรงพยาบาล</h2>

      <form onSubmit={addHospital} className="space-y-2 mb-4">
        <input
          className="input"
          placeholder="ชื่อโรงพยาบาล"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          placeholder="ที่อยู่"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button className="btn btn-primary w-full">เพิ่มโรงพยาบาล</button>
      </form>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">ชื่อ</th>
            <th className="p-2 border">ที่อยู่</th>
          </tr>
        </thead>
        <tbody>
          {list.map((h) => (
            <tr key={h.id}>
              <td className="border p-2">{h.name}</td>
              <td className="border p-2">{h.address}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
