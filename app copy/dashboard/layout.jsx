import Protected from "@/components/Protected";
import Nav from "@/components/Nav";

export default function DashboardLayout({ children }) {
  return (
    <Protected>
      <Nav />
      <div className="p-3">{children}</div>
    </Protected>
  );
}
