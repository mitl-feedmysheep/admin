"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  churchId?: string;
  churchName?: string;
  memberName?: string;
}

export function AdminLayoutClient({
  children,
  churchId,
  churchName,
  memberName,
}: AdminLayoutClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const handleNavigate = () => {
    setMobileOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar
          churchId={churchId}
          churchName={churchName}
          memberName={memberName}
        />
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 border-r-0 bg-slate-900 text-white [&>button]:text-white [&>button]:hover:text-slate-300"
        >
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden>
          <Sidebar
            churchId={churchId}
            churchName={churchName}
            memberName={memberName}
            onNavigate={handleNavigate}
          />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-auto">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            IntoTheHeaven
          </span>
          {churchName && (
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
              {churchName}
            </span>
          )}
        </header>

        <main className="flex-1">
          <div className="container mx-auto p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
