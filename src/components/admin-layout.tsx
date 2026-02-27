import { getSession } from "@/lib/auth";
import { AdminLayoutClient } from "./admin-layout-client";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getSession();
  const isSystemAdmin = session?.memberId === process.env.SYSTEM_ADMIN_MEMBER_ID;

  return (
    <AdminLayoutClient
      churchId={session?.churchId}
      churchName={session?.churchName}
      memberName={session?.memberName}
      role={session?.role}
      isSystemAdmin={isSystemAdmin}
    >
      {children}
    </AdminLayoutClient>
  );
}
