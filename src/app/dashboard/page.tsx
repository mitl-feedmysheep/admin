import { AdminLayout } from "@/components/admin-layout";
import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <AdminLayout>
      <DashboardClient />
    </AdminLayout>
  );
}
