export default function DashboardHome() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card">
        <h2 className="text-xl font-semibold mb-2">ภาพรวมระบบ</h2>
        <p className="text-gray-600">ยินดีต้อนรับสู่ HealthConnect</p>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold mb-2">คำแนะนำ</h2>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>ไปที่ Appointments เพื่อจองนัด</li>
          <li>EMR เพื่อดูเวชระเบียน</li>
          <li>Prescriptions/Medication สำหรับการสั่งยาและแจ้งเตือน</li>
        </ul>
      </div>
    </div>
  );
}
