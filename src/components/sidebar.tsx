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
  Settings,
  Activity,
  Building2,
  ChevronDown,
  UserPlus,
} from "lucide-react";
import { canAccessVisitPrayer } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";

const navigation: ({ type: "link"; name: string; href: string; icon: typeof LayoutDashboard } | { type: "divider" })[] = [
  { type: "link", name: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { type: "divider" },
  { type: "link", name: "교적부", href: "/members", icon: Users },
  { type: "divider" },
  { type: "link", name: "교회 관리", href: "/manage/church", icon: Church },
  { type: "link", name: "부서 관리", href: "/manage/departments", icon: Building2 },
  { type: "link", name: "소그룹 관리", href: "/manage/group", icon: UsersRound },
  { type: "link", name: "멤버 관리", href: "/manage/member", icon: Users },
  { type: "link", name: "새가족 관리", href: "/manage/newcomer", icon: GraduationCap },
  { type: "link", name: "이벤트 관리", href: "/manage/event", icon: CalendarDays },
];

type NavItem = { type: "link"; name: string; href: string; icon: typeof LayoutDashboard } | { type: "divider" };

const visitPrayerNavigation: NavItem[] = [
  { type: "divider" },
  { type: "link", name: "심방 관리", href: "/manage/visit", icon: Home },
  { type: "link", name: "기도제목 관리", href: "/manage/prayer", icon: BookOpen },
];

const superAdminNavigation: NavItem[] = [];

interface AdminChurch {
  churchId: string;
  churchName: string;
  role: string;
}

interface AdminDepartment {
  id: string;
  name: string;
}

interface SidebarProps {
  churchId?: string;
  churchName?: string;
  memberName?: string;
  role?: string;
  departmentId?: string;
  departmentName?: string;
  departmentRole?: string;
  isSystemAdmin?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({
  churchId, churchName, memberName, role, departmentId, departmentName, departmentRole,
  isSystemAdmin, onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Church switcher state
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [churches, setChurches] = useState<AdminChurch[] | null>(null);
  const [isLoadingChurches, setIsLoadingChurches] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string>("");

  // Department switcher state
  const [deptSwitcherOpen, setDeptSwitcherOpen] = useState(false);
  const [departments, setDepartments] = useState<AdminDepartment[] | null>(null);
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);
  const [isSwitchingDept, setIsSwitchingDept] = useState(false);

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
      window.location.href = "/dashboard";
    } catch {
      setSwitchError("교회 전환에 실패했습니다.");
    } finally {
      setIsSwitching(false);
    }
  };

  const loadDepartments = async () => {
    if (!churchId) return;
    setIsLoadingDepts(true);
    try {
      const res = await fetch(`/api/departments?churchId=${churchId}`, { method: "GET" });
      const data = await res.json();
      if (res.ok) {
        setDepartments(data.data?.departments || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingDepts(false);
    }
  };

  const switchDepartment = async (nextDeptId: string) => {
    if (!nextDeptId || nextDeptId === departmentId) return;
    setIsSwitchingDept(true);
    try {
      const res = await fetch("/api/auth/select-department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: nextDeptId }),
      });
      if (res.ok) {
        setDeptSwitcherOpen(false);
        window.location.href = "/dashboard";
      }
    } catch {
      // ignore
    } finally {
      setIsSwitchingDept(false);
    }
  };

  useEffect(() => {
    if (!switcherOpen) return;
    if (churches !== null) return;
    void loadAdminChurches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switcherOpen]);

  useEffect(() => {
    if (!deptSwitcherOpen) return;
    if (departments !== null) return;
    void loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptSwitcherOpen]);

  // Build navigation based on permissions
  const showVisitPrayer = canAccessVisitPrayer(role ?? "", departmentRole);
  const isSuperAdmin = role === "SUPER_ADMIN";

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-white md:sticky md:top-0">
      {/* Logo & Church & Department */}
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <Church className="h-6 w-6 text-indigo-400" />
          <span className="text-lg font-semibold">IntoTheHeaven</span>
        </div>

        {/* Church Switcher */}
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
                              isActive ? "bg-indigo-600/20 text-white" : "text-slate-200 hover:bg-slate-800",
                              (isSwitching || isActive) && "opacity-60"
                            )}
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800">
                              <Church className="h-4 w-4 text-indigo-300" />
                            </span>
                            <span className="flex-1">
                              <span className="block font-medium">{c.churchName}</span>
                            </span>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-300">
                                <Check className="h-4 w-4" /> 현재
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Department Switcher */}
        {departmentName && (
          <Popover open={deptSwitcherOpen} onOpenChange={setDeptSwitcherOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2 text-left transition-colors hover:bg-slate-800"
              >
                <div>
                  <p className="text-xs text-slate-400">부서</p>
                  <p className="text-sm font-medium text-white">{departmentName}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={4}
              className="w-[calc(100vw-2rem)] sm:w-72 border-slate-800 bg-slate-900 p-0 text-white shadow-xl"
            >
              <div className="border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-semibold">부서 전환</p>
              </div>
              <div className="max-h-60 overflow-auto p-2">
                {isLoadingDepts && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중...
                  </div>
                )}
                {!isLoadingDepts && departments && departments.map((d) => {
                  const isActive = d.id === departmentId;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={isSwitchingDept || isActive}
                      onClick={() => void switchDepartment(d.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        isActive ? "bg-indigo-600/20 text-white" : "text-slate-200 hover:bg-slate-800",
                        (isSwitchingDept || isActive) && "opacity-60"
                      )}
                    >
                      <Building2 className="h-4 w-4 text-indigo-300" />
                      <span className="flex-1">{d.name}</span>
                      {isActive && <Check className="h-4 w-4 text-indigo-300" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {[
          ...navigation,
          ...(showVisitPrayer ? visitPrayerNavigation : []),
          ...(isSuperAdmin ? superAdminNavigation : []),
        ].map((item, index) => {
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

      {/* System Admin Menu */}
      {isSystemAdmin && (
        <div className="border-t border-slate-800 px-3 py-2">
          <Link
            href="/system/church"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/system/church")
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Settings className="h-5 w-5" />
            교회 생성
          </Link>
          <Link
            href="/system/monitoring"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/system/monitoring")
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Activity className="h-5 w-5" />
            모니터링
          </Link>
        </div>
      )}

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
