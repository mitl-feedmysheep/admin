import { AdminLayout } from "@/components/admin-layout";
import { MonitoringClient } from "./monitoring-client";

export default function MonitoringPage() {
  return (
    <AdminLayout>
      <MonitoringClient />
    </AdminLayout>
  );
}
