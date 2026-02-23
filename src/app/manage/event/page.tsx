import { AdminLayout } from "@/components/admin-layout";
import { EventManageClient } from "./event-manage-client";

export default function EventManagePage() {
  return (
    <AdminLayout>
      <EventManageClient />
    </AdminLayout>
  );
}
