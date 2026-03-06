import { AdminLayout } from "@/components/admin-layout";
import { MemberManageClient } from "./member-manage-client";

export default function MemberManagePage() {
  return (
    <AdminLayout>
      <MemberManageClient />
    </AdminLayout>
  );
}
