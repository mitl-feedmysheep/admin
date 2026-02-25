import { AdminLayout } from "@/components/admin-layout";
import { NewcomerManageClient } from "./newcomer-manage-client";

export default function NewcomerManagePage() {
  return (
    <AdminLayout>
      <NewcomerManageClient />
    </AdminLayout>
  );
}
