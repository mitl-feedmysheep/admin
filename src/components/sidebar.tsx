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
  RefreshCcw,
  Loader2,
  Check,
  CalendarDays,
  GraduationCap,
  Home,
  BookOpen,
} from "lucide-react";
import { hasPermissionOver } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";

const navigation: ({ type: "link"; name: string; href: string; icon: typeof LayoutDashboard } | { type: "divider" })[] = [
  { type: "link", name: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { type: "divider" },
  { type: "link", name: "교적부", href: "/members", icon: Users },
  { type: "divider" },
  { type: "link", name: "교회 관리", href: "/manage/church", icon: Church },
  { type: "link", name: "소그룹 관리", href: "/manage/group", icon: UsersRound },
  { type: "link", name: "새가족 관리", href: "/manage/newcomer", icon: GraduationCap },
  { type: "link", name: "이벤트 관리", href: "/manage/event", icon: CalendarDays },
];

type NavItem = { type: "link"; name: string; href: string; icon: typeof LayoutDashboard } | { type: "divider" };

const superAdminNavigation: NavItem[] = [
  { type: "divider" },
  { type: "link", name: "심방 관리", href: "/manage/visit", icon: Home },
  { type: "link", name: "기도제목 관리", href: "/manage/prayer", icon: BookOpen },
];

interface AdminChurch {
  churchId: string;
  churchName: string;
  role: string;
}

interface SidebarProps {
  churchId?: string;
  churchName?: string;
  memberName?: string;
  role?: string;
  onNavigate?: () => void;
}

export function Sidebar({ churchId, churchName, memberName, role, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [churches, setChurches] = useState<AdminChurch[] | null>(null);
  const [isLoadingChurches, setIsLoadingChurches] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string>("");

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const loadAdminChurches = async () => {
    setIsLoadingChurches(true);
    setSwitchError("");
    try {
      const res = await fetch("/api/auth/admin-churches", { method: "GET" });
      const data = await res.json();
      if (!res.ok) {
        setSwitchError(data.error || "교회 목록을 불러오지 못했습니다.");
        return;
      }
      setChurches(data.churches || []);
    } catch {
      setSwitchError("교회 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingChurches(false);
    }
  };

  const switchChurch = async (nextChurchId: string) => {
    if (!nextChurchId || nextChurchId === churchId) return;
    setIsSwitching(true);
    setSwitchError("");
    try {
      const res = await fetch("/api/auth/select-church", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ churchId: nextChurchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSwitchError(data.error || "교회 전환에 실패했습니다.");
        return;
      }

      setSwitcherOpen(false);
      router.refresh();
    } catch {
      setSwitchError("교회 전환에 실패했습니다.");
    } finally {
      setIsSwitching(false);
    }
  };

  useEffect(() => {
    if (!switcherOpen) return;
    if (churches !== null) return;
    void loadAdminChurches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switcherOpen]);

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-white md:sticky md:top-0">
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
            <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-white"
                  title="교회 변경"
                  disabled={isSwitching}
                >
                  {isSwitching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={8}
                collisionPadding={16}
                className="w-[calc(100vw-2rem)] sm:w-80 border-slate-800 bg-slate-900 p-0 text-white shadow-xl"
              >
                <div className="border-b border-slate-800 px-4 py-3">
                  <p className="text-sm font-semibold">교회 전환</p>
                  <p className="text-xs text-slate-400">등록된 교회에서 선택하세요</p>
                </div>

                <div className="max-h-72 overflow-auto p-2">
                  {isLoadingChurches && (
                    <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      불러오는 중...
                    </div>
                  )}

                  {!isLoadingChurches && switchError && (
                    <div className="space-y-2 px-2 py-1">
                      <p className="text-sm text-red-400">{switchError}</p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 w-full bg-slate-800 text-white hover:bg-slate-700"
                        onClick={() => void loadAdminChurches()}
                        disabled={isSwitching}
                      >
                        다시 불러오기
                      </Button>
                    </div>
                  )}

                  {!isLoadingChurches && !switchError && (churches?.length ?? 0) === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-300">
                      전환 가능한 교회가 없습니다.
                    </div>
                  )}

                  {!isLoadingChurches && !switchError && churches && churches.length > 0 && (
                    <div className="space-y-1">
                      {churches.map((c) => {
                        const isActive = !!churchId && c.churchId === churchId;
                        return (
                          <button
                            key={c.churchId}
                            type="button"
                            disabled={isSwitching || isActive}
                            onClick={() => void switchChurch(c.churchId)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                              isActive
                                ? "bg-indigo-600/20 text-white"
                                : "text-slate-200 hover:bg-slate-800",
                              (isSwitching || isActive) && "opacity-60"
                            )}
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800">
                              <Church className="h-4 w-4 text-indigo-300" />
                            </span>
                            <span className="flex-1">
                              <span className="block font-medium">{c.churchName}</span>
                              <span className="block text-xs text-slate-400">관리자</span>
                            </span>
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-300">
                                <Check className="h-4 w-4" />
                                현재
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">전환</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-800 px-4 py-3">
                  <p className="text-xs text-slate-400">
                    전환하면 대시보드가 새로고침됩니다.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {[...navigation, ...(role && hasPermissionOver(role, "SUPER_ADMIN") ? superAdminNavigation : [])].map((item, index) => {
          if (item.type === "divider") {
            return <div key={`divider-${index}`} className="my-2 border-t border-slate-700/50" />;
          }
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
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
