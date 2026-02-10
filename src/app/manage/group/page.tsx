import { AdminLayout } from "@/components/admin-layout";
import { GroupManageClient } from "./group-manage-client";

export default function GroupManagePage() {
  return (
    <AdminLayout>
      <GroupManageClient />
    </AdminLayout>
  );
}
