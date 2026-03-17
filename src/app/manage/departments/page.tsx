import { AdminLayout } from "@/components/admin-layout";
import { DepartmentManageClient } from "./department-manage-client";

export default function DepartmentManagePage() {
  return (
    <AdminLayout>
      <DepartmentManageClient />
    </AdminLayout>
  );
}
