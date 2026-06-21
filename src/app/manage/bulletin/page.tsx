import { AdminLayout } from "@/components/admin-layout";
import { BulletinManageClient } from "./bulletin-manage-client";

export default function BulletinManagePage() {
  return (
    <AdminLayout>
      <BulletinManageClient />
    </AdminLayout>
  );
}
