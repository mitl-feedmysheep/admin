import { AdminLayout } from "@/components/admin-layout";
import { ReadingManageClient } from "./reading-manage-client";

export default function ReadingManagePage() {
  return (
    <AdminLayout>
      <ReadingManageClient />
    </AdminLayout>
  );
}
