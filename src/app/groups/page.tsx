import { AdminLayout } from "@/components/admin-layout";
import { GroupsClient } from "./groups-client";

export default function GroupsPage() {
  return (
    <AdminLayout>
      <GroupsClient />
    </AdminLayout>
  );
}
