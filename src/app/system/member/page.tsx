import { AdminLayout } from "@/components/admin-layout";
import { SystemMemberClient } from "./system-member-client";

export default function SystemMemberPage() {
  return (
    <AdminLayout>
      <SystemMemberClient />
    </AdminLayout>
  );
}
