import Link from "next/link";

export default function Home() {
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold">HealthConnect Platform</h1>
      <p className="text-gray-600">Starter (Next.js + Supabase + Tailwind)</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">เริ่มต้นใช้งาน</h2>
          <p className="mb-4">สมัครบัญชี / เข้าสู่ระบบเพื่อเข้าสู่แดชบอร์ด</p>
          <div className="flex gap-3">
            <Link href="/signup" className="btn btn-primary">สมัครสมาชิก</Link>
            <Link href="/login" className="btn border">เข้าสู่ระบบ</Link>
          </div>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">แดชบอร์ด</h2>
          <p className="mb-4">ตัวอย่างเมนูแต่ละโมดูล</p>
          <Link href="/dashboard" className="btn border">ไปที่ Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
