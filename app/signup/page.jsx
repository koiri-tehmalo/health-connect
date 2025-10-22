"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setErr(error.message);
    else router.replace("/dashboard");
  }

  return (
    <div className="max-w-md mx-auto mt-12 card">
      <h1 className="text-2xl font-semibold mb-4">สมัครสมาชิก</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">อีเมล</label>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">รหัสผ่าน</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="btn btn-primary w-full">สมัครสมาชิก</button>
      </form>
      <p className="mt-4 text-sm">
        มีบัญชีแล้ว? <a href="/login">เข้าสู่ระบบ</a>
      </p>
    </div>
  );
}
