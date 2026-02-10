import { AdminLayout } from "@/components/admin-layout";
import { ChurchManageClient } from "./church-manage-client";

export default function ChurchManagePage() {
  return (
    <AdminLayout>
      <ChurchManageClient />
    </AdminLayout>
  );
}
