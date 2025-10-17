export const metadata = {
  title: "HealthConnect Platform",
  description: "Next.js + Supabase + Tailwind starter"
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="min-h-screen">
        <div className="mx-auto max-w-6xl p-4">{children}</div>
      </body>
    </html>
  );
}
