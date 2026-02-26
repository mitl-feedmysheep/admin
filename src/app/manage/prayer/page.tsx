import { AdminLayout } from "@/components/admin-layout";
import { PrayerManageClient } from "./prayer-manage-client";

export default function PrayerManagePage() {
  return (
    <AdminLayout>
      <PrayerManageClient />
    </AdminLayout>
  );
}
