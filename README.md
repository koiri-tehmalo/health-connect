# HealthConnect Platform — Next.js + Supabase + Tailwind (Starter)

โครงเริ่มต้นสำหรับ HealthConnect ที่มีหน้า auth (login/signup) และแดชบอร์ดพร้อมเมนูโมดูลหลัก

## คุณสมบัติ
- Next.js (App Router) + TailwindCSS
- Supabase Auth (email/password)
- โครงหน้า Dashboard สำหรับโมดูล: Appointments, EMR, Prescriptions, Medication Reminder, Wearables, Analytics, Notifications, Admin

## การติดตั้ง
1) แตกไฟล์และเข้าโฟลเดอร์
```bash
npm install
```
2) สร้างไฟล์ `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
3) รันโหมดพัฒนา
```bash
npm run dev
```
4) เปิดที่ http://localhost:3000

> หมายเหตุ: หน้าต่าง ๆ ยังเป็น placeholder — เชื่อม table/view ของคุณใน Supabase แล้วเรียกใช้งานผ่าน `@/lib/supabaseClient` ได้เลย
