import { AdminLayout } from "@/components/admin-layout";
import { AnnouncementManageClient } from "./announcement-manage-client";

export default function AnnouncementManagePage() {
  return (
    <AdminLayout>
      <AnnouncementManageClient />
    </AdminLayout>
  );
}
