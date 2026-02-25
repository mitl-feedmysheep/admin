import { getSession } from "@/lib/auth";
import { AdminLayoutClient } from "./admin-layout-client";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getSession();

  return (
    <AdminLayoutClient
      churchId={session?.churchId}
      churchName={session?.churchName}
      memberName={session?.memberName}
    >
      {children}
    </AdminLayoutClient>
  );
}
