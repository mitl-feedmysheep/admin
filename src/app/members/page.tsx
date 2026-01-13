import { AdminLayout } from "@/components/admin-layout";
import { MembersClient } from "./members-client";

export default function MembersPage() {
  return (
    <AdminLayout>
      <MembersClient />
    </AdminLayout>
  );
}
