"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  UsersRound, 
  LogOut,
  Church,
  RefreshCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { name: "교적부", href: "/members", icon: Users },
  { name: "그룹 관리", href: "/groups", icon: UsersRound },
];

interface SidebarProps {
  churchName?: string;
  memberName?: string;
}

export function Sidebar({ churchName, memberName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleSwitchChurch = async () => {
    // 로그아웃 후 로그인 페이지로 (교회 재선택)
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-white">
      {/* Logo & Church */}
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <Church className="h-6 w-6 text-indigo-400" />
          <span className="text-lg font-semibold">IntoTheHeaven</span>
        </div>
        {churchName && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2">
            <div>
              <p className="text-xs text-slate-400">관리 중인 교회</p>
              <p className="text-sm font-medium text-white">{churchName}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={handleSwitchChurch}
              title="교회 변경"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-slate-800 p-4">
        {memberName && (
          <p className="mb-2 px-3 text-sm text-slate-400">
            {memberName}님
          </p>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          로그아웃
        </Button>
      </div>
    </aside>
  );
}
