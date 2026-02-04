import { Sidebar } from "@/components/sidebar";
import { getSession } from "@/lib/auth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar 
        churchId={session?.churchId}
        churchName={session?.churchName} 
        memberName={session?.memberName}
      />
      <main
        key={session?.churchId ?? "no-church"}
        className="flex-1 overflow-auto"
      >
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
