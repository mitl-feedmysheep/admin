import { AdminLayout } from "@/components/admin-layout";
import { ManageClient } from "./manage-client";

export default function ManagePage() {
  return (
    <AdminLayout>
      <ManageClient />
    </AdminLayout>
  );
}
