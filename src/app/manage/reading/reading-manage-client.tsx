"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog, ConfirmDialogVariant } from "@/components/confirm-dialog";
import {
  Plus,
  Loader2,
  BookMarked,
  Upload,
  ChevronLeft,
  ChevronRight,
  Download,
  ImagePlus,
  Info,
  X,
  Pencil,
  Check,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ReadingPlan {
  id: string;
  title: string;
  readingDays: number;
  createdAt: string;
}

interface ReadingPlanDay {
  id: string;
  dayNumber: number;
  readingRange: string;
  audioUrl: string | null;
  videoUrl: string | null;
  description: string | null;
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

function readingDaysToLabel(mask: number): string {
  return DAY_LABELS.filter((_, i) => (mask & (1 << i)) !== 0).join("");
}

interface DepartmentInfo {
  id: string;
  name: string;
  activePlanTitle: string | null;
  activePlanId: string | null;
}

interface DeptMemberProgress {
  memberId: string;
  memberName: string;
  completedCount: number;
  totalDays: number;
  progressPercent: number;
}

interface DeptStatsMeta {
  todayCount: number;
  totalMembers: number;
  totalDays: number;
  planTitle: string;
  startDate: string;
  endDate: string;
}

interface DeptStats {
  meta: DeptStatsMeta;
  data: DeptMemberProgress[];
}

interface GroupWeeklyProgress {
  groupId: string;
  groupName: string;
  totalMembers: number;
  scheduledDays: number;
  completedCount: number;
  completionRate: number;
}

interface WeeklyGroupData {
  weekStart: string;
  weekEnd: string;
  scheduledDayCount: number;
  data: GroupWeeklyProgress[];
}

function getCurrentMondayStr(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const [, wsM, wsD] = weekStart.split("-").map(Number);
  const [, weM, weD] = weekEnd.split("-").map(Number);
  const weekNum = Math.ceil(wsD / 7);
  return `${wsM}월 ${weekNum}주차  (${wsM}/${wsD}~${weM}/${weD})`;
}

export function ReadingManageClient() {
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [activateStartDate, setActivateStartDate] = useState("");
  const [activateEndDate, setActivateEndDate] = useState("");
  const [activatingDept, setActivatingDept] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"stats" | "plan">("stats");
  const [deptStats, setDeptStats] = useState<Record<string, DeptStats | null>>({});
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({});
  const [weekStartStr, setWeekStartStr] = useState<string>(getCurrentMondayStr);
  const [weeklyData, setWeeklyData] = useState<Record<string, WeeklyGroupData | null>>({});
  const [weeklyLoading, setWeeklyLoading] = useState<Record<string, boolean>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string;
    mode: "confirm" | "alert"; variant: ConfirmDialogVariant; onConfirm?: () => void;
  }>({ open: false, title: "", description: "", mode: "alert", variant: "info" });

  const [createForm, setCreateForm] = useState({ title: "", readingDays: 63 });

  const [planDetailSheet, setPlanDetailSheet] = useState<{ open: boolean; plan: ReadingPlan | null }>({
    open: false, plan: null,
  });
  const [planDays, setPlanDays] = useState<ReadingPlanDay[]>([]);
  const [planDaysLoading, setPlanDaysLoading] = useState(false);
  const [detailBatchFile, setDetailBatchFile] = useState<File | null>(null);
  const [dayMediaMap, setDayMediaMap] = useState<Record<string, { id: string; url: string }[]>>({});
  const [uploadingDayId, setUploadingDayId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageTargetDayId, setImageTargetDayId] = useState<string | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ readingRange: "", description: "", audioUrl: "", videoUrl: "" });
  const [editSaving, setEditSaving] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const showAlert = (title: string, description: string, variant: ConfirmDialogVariant = "info") => {
    setConfirmDialog({ open: true, title, description, mode: "alert", variant, onConfirm: undefined });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, deptsRes] = await Promise.all([
        fetch("/api/reading-plans"),
        fetch("/api/reading-plans/departments"),
      ]);
      const plansJson = await plansRes.json();
      const deptsJson = await deptsRes.json();
      if (plansJson.success) setPlans(plansJson.data);
      if (deptsJson.success) {
        const depts: DepartmentInfo[] = deptsJson.data;
        setDepartments(depts);
        const activeDepts = depts.filter((d) => d.activePlanTitle);
        if (activeDepts.length > 0) {
          const loadingMap: Record<string, boolean> = {};
          activeDepts.forEach((d) => (loadingMap[d.id] = true));
          setStatsLoading(loadingMap);
          await Promise.all(
            activeDepts.map(async (dept) => {
              try {
                const res = await fetch(`/api/departments/${dept.id}/reading-plan/progress`);
                const json = await res.json();
                if (json.success) setDeptStats((prev) => ({ ...prev, [dept.id]: json }));
              } finally {
                setStatsLoading((prev) => ({ ...prev, [dept.id]: false }));
              }
            })
          );
        }
      }
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeeklyData = useCallback(async (depts: DepartmentInfo[], weekStart: string) => {
    const activeDepts = depts.filter((d) => d.activePlanTitle);
    if (activeDepts.length === 0) return;
    const loadingMap: Record<string, boolean> = {};
    activeDepts.forEach((d) => (loadingMap[d.id] = true));
    setWeeklyLoading((prev) => ({ ...prev, ...loadingMap }));
    await Promise.all(
      activeDepts.map(async (dept) => {
        try {
          const res = await fetch(
            `/api/departments/${dept.id}/reading-plan/weekly-group-progress?weekStart=${weekStart}`
          );
          const json = await res.json();
          if (json.success) setWeeklyData((prev) => ({ ...prev, [dept.id]: json }));
        } finally {
          setWeeklyLoading((prev) => ({ ...prev, [dept.id]: false }));
        }
      })
    );
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (departments.length === 0) return;
    fetchWeeklyData(departments, weekStartStr);
  }, [departments, weekStartStr, fetchWeeklyData]);

  const handleCreatePlan = async () => {
    if (!createForm.title || createForm.readingDays === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reading-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: createForm.title, readingDays: createForm.readingDays }),
      });
      const json = await res.json();
      if (json.success) {
        setCreateDialogOpen(false);
        setCreateForm({ title: "", readingDays: 63 });
        fetchData();
      } else {
        showAlert("오류", json.error || "생성 실패", "danger");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!activatingDept || !selectedPlanId || !activateStartDate || !activateEndDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/departments/${activatingDept.id}/reading-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readingPlanId: selectedPlanId,
          startDate: activateStartDate,
          endDate: activateEndDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const planTitle = plans.find((p) => p.id === selectedPlanId)?.title ?? "";
        setActivatingDept(null);
        setSelectedPlanId("");
        setActivateStartDate("");
        setActivateEndDate("");
        fetchData();
        toast.success(`${activatingDept.name}에 [${planTitle}]이 활성화됐습니다.`);
      } else {
        showAlert("오류", json.error || "활성화 실패", "danger");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (deptId: string, deptName: string, planTitle: string) => {
    setConfirmDialog({
      open: true,
      title: "플랜 비활성화",
      description: `${deptName}의 [${planTitle}]을 비활성화하시겠습니까?\n\n비활성화하면 더이상 유저에게 읽을 분량이 할당되지 않고, 알림도 가지 않아요.`,
      mode: "confirm",
      variant: "danger",
      onConfirm: async () => {
        await fetch(`/api/departments/${deptId}/reading-plan`, { method: "DELETE" });
        fetchData();
      },
    });
  };

  const openPlanDetail = async (plan: ReadingPlan) => {
    setPlanDetailSheet({ open: true, plan });
    setPlanDaysLoading(true);
    setPlanDays([]);
    setDayMediaMap({});
    try {
      const res = await fetch(`/api/reading-plans/${plan.id}/days`);
      const json = await res.json();
      if (json.success) {
        const days: ReadingPlanDay[] = json.data;
        setPlanDays(days);
        const mediaEntries = await Promise.all(
          days.map(async (d) => {
            const r = await fetch(`/api/reading-plans/${plan.id}/days/${d.id}/media`);
            const rj = await r.json();
            return [d.id, rj.success ? rj.data : []] as [string, { id: string; url: string }[]];
          })
        );
        setDayMediaMap(Object.fromEntries(mediaEntries));
      }
    } finally {
      setPlanDaysLoading(false);
    }
  };

  const triggerImageUpload = (dayId: string) => {
    setImageTargetDayId(dayId);
    imageInputRef.current?.click();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imageTargetDayId || !planDetailSheet.plan) return;
    e.target.value = "";

    const planId = planDetailSheet.plan.id;
    const dayId = imageTargetDayId;
    setUploadingDayId(dayId);
    const toastId = toast.loading("이미지 업로드 중...");
    try {
      const presignRes = await fetch(`/api/reading-plans/${planId}/days/${dayId}/media/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, fileName: file.name }),
      });
      const presignJson = await presignRes.json();
      if (!presignJson.success) throw new Error(presignJson.error);

      const { uploadUrl, publicUrl } = presignJson.data;
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("R2 업로드 실패");

      const saveRes = await fetch(`/api/reading-plans/${planId}/days/${dayId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl }),
      });
      const saveJson = await saveRes.json();
      if (!saveJson.success) throw new Error(saveJson.error);

      setDayMediaMap((prev) => ({
        ...prev,
        [dayId]: [...(prev[dayId] ?? []), saveJson.data],
      }));
      toast.success("이미지가 등록됐습니다.", { id: toastId });
    } catch (err) {
      toast.error(`이미지 업로드 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`, { id: toastId });
    } finally {
      setUploadingDayId(null);
      setImageTargetDayId(null);
    }
  };

  const handleDeleteMedia = async (dayId: string, mediaId: string) => {
    if (!planDetailSheet.plan) return;
    const res = await fetch(`/api/reading-plans/${planDetailSheet.plan.id}/days/${dayId}/media`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId }),
    });
    if ((await res.json()).success) {
      setDayMediaMap((prev) => ({
        ...prev,
        [dayId]: (prev[dayId] ?? []).filter((m) => m.id !== mediaId),
      }));
    }
  };

  const handleDetailBatchUploadWithFile = async (file: File) => {
    if (!planDetailSheet.plan) return;
    const detailBatchFile = file;
    setSaving(true);
    const toastId = toast.loading("엑셀 파일을 읽는 중...");
    try {
      const wb = XLSX.read(await detailBatchFile.arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      if (raw.length === 0) {
        toast.error("데이터가 비어있습니다.", { id: toastId });
        return;
      }

      const errors: string[] = [];
      const rows = raw.map((r, idx) => {
        const rowNum = idx + 2;
        const dayNumber = Number(r["순서"]);
        const readingRange = String(r["분량"] ?? "").trim();
        if (!r["순서"] && r["순서"] !== 0) errors.push(`${rowNum}행: '순서' 값 없음`);
        else if (!Number.isInteger(dayNumber) || dayNumber < 1) errors.push(`${rowNum}행: '순서'는 1 이상 정수여야 합니다 (현재: ${r["순서"]})`);
        if (!readingRange) errors.push(`${rowNum}행: '분량' 값 없음`);
        return {
          dayNumber,
          readingRange,
          audioUrl: String(r["오디오링크(옵션)"] ?? "").trim() || null,
          videoUrl: String(r["비디오링크(옵션)"] ?? "").trim() || null,
          description: String(r["설명"] ?? "").trim() || null,
        };
      });

      if (errors.length > 0) {
        toast.error(`검증 오류 (${errors.length}건)\n${errors.slice(0, 5).join("\n")}`, { id: toastId, duration: 8000 });
        return;
      }

      toast.loading(`${rows.length}개 일정을 저장하는 중...`, { id: toastId });
      const res = await fetch(`/api/reading-plans/${planDetailSheet.plan.id}/days/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${rows.length}개 일정이 등록됐습니다.`, { id: toastId });
        setDetailBatchFile(null);
        openPlanDetail(planDetailSheet.plan);
      } else {
        toast.error(json.error || "업로드 실패", { id: toastId });
      }
    } catch {
      toast.error("파일을 읽을 수 없습니다. 올바른 엑셀 파일인지 확인해주세요.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const downloadSampleExcel = () => {
    const sample = [
      { 순서: 1, 분량: "창 1-4", 설명: "창세기1", "오디오링크(옵션)": "", "비디오링크(옵션)": "" },
      { 순서: 2, 분량: "창 5-8", 설명: "창세기1", "오디오링크(옵션)": "", "비디오링크(옵션)": "" },
      { 순서: 3, 분량: "창 9-12", 설명: "창세기1", "오디오링크(옵션)": "", "비디오링크(옵션)": "" },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws["!cols"] = [{ wch: 8 }, { wch: 16 }, { wch: 20 }, { wch: 36 }, { wch: 36 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "일정");
    XLSX.writeFile(wb, "reading_plan_sample.xlsx");
  };

  const startEditDay = (day: ReadingPlanDay) => {
    setEditingDayId(day.id);
    setEditForm({
      readingRange: day.readingRange,
      description: day.description ?? "",
      audioUrl: day.audioUrl ?? "",
      videoUrl: day.videoUrl ?? "",
    });
  };

  const cancelEditDay = () => {
    setEditingDayId(null);
  };

  const saveEditDay = async (dayId: string) => {
    if (!planDetailSheet.plan || !editForm.readingRange.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/reading-plans/${planDetailSheet.plan.id}/days/${dayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readingRange: editForm.readingRange,
          description: editForm.description || null,
          audioUrl: editForm.audioUrl || null,
          videoUrl: editForm.videoUrl || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPlanDays((prev) => prev.map((d) => d.id === dayId ? json.data : d));
        setEditingDayId(null);
        toast.success("수정됐습니다.");
      } else {
        toast.error(json.error || "수정 실패");
      }
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <BookMarked className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">성경통독플랜 관리</h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-6 border-b -mt-2">
        {(["stats", "plan"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "stats" ? "통계" : "플랜관리"}
          </button>
        ))}
      </div>

      {/* ── 통계 탭 ── */}
      {activeTab === "stats" && (
        departments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">부서 데이터가 없습니다.</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {departments.map((dept) => {
              const isActive = !!dept.activePlanTitle;
              const stats = deptStats[dept.id];
              const isLoadingStats = statsLoading[dept.id];
              const avgProgress =
                stats && stats.meta.totalMembers > 0
                  ? Math.round(stats.data.reduce((s, m) => s + m.progressPercent, 0) / stats.meta.totalMembers)
                  : 0;

              return (
                <Card key={dept.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      {isActive ? (
                        <Badge variant="secondary" className="text-xs">{dept.activePlanTitle}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">비활성</Badge>
                      )}
                    </div>
                    {isActive && stats?.meta && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats.meta.startDate} ~ {stats.meta.endDate}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!isActive ? (
                      <p className="text-sm text-center text-muted-foreground py-4">
                        활성화된 플랜이 없습니다. <span className="underline cursor-pointer" onClick={() => setActiveTab("plan")}>플랜관리</span> 탭에서 활성화해 주세요.
                      </p>
                    ) : (
                    <div className="space-y-5">
                      {/* 평균 진도 */}
                      {isLoadingStats ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      ) : stats ? (
                        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgProgress}%</p>
                          <p className="text-xs text-muted-foreground mt-0.5">전체 평균 진도</p>
                        </div>
                      ) : null}

                      {/* 소모임별 주차 진도 */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">소모임별 주차 진도</p>
                        {/* 주차 내비게이션 */}
                        <div className="flex items-center justify-between rounded-lg border px-3 py-2 mb-3">
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date(weekStartStr + "T00:00:00");
                              d.setDate(d.getDate() - 7);
                              setWeekStartStr(d.toISOString().slice(0, 10));
                            }}
                            className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-xs font-medium">
                            {weeklyData[dept.id]
                              ? formatWeekLabel(weeklyData[dept.id]!.weekStart, weeklyData[dept.id]!.weekEnd)
                              : weeklyLoading[dept.id] ? "로딩 중..." : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date(weekStartStr + "T00:00:00");
                              d.setDate(d.getDate() + 7);
                              setWeekStartStr(d.toISOString().slice(0, 10));
                            }}
                            disabled={weekStartStr >= getCurrentMondayStr()}
                            className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        {/* 계산 기준 안내 */}
                        <div className="flex items-center gap-1.5 mb-3">
                          <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">이번 주 오늘까지 읽어야 할 날짜 기준으로 집계됩니다.</p>
                        </div>

                        {/* 소모임 목록 */}
                        {weeklyLoading[dept.id] ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        ) : !weeklyData[dept.id] || weeklyData[dept.id]!.data.length === 0 ? (
                          <p className="text-sm text-center text-muted-foreground py-3">등록된 소모임이 없습니다.</p>
                        ) : weeklyData[dept.id]!.scheduledDayCount === 0 ? (
                          <p className="text-sm text-center text-muted-foreground py-3">이 주는 읽기 일정이 없습니다.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {weeklyData[dept.id]!.data.map((group) => (
                              <div key={group.groupId} className="flex items-center gap-3">
                                <span className="text-sm w-20 shrink-0 truncate">{group.groupName}</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full">
                                  <div
                                    className="h-1.5 bg-primary rounded-full transition-all"
                                    style={{ width: `${group.completionRate}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0 text-right">
                                  {group.completedCount}/{group.totalMembers}명 · {group.completionRate}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        )
      )}

      {/* ── 플랜관리 탭 ── */}
      {activeTab === "plan" && (
        <div className="space-y-6">

          {/* 등록 방법 안내 */}
          <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
            <p className="text-sm font-semibold">플랜 등록 방법</p>
            <ol className="space-y-2 text-sm text-muted-foreground list-none">
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
                <span><span className="font-medium text-foreground">플랜 생성</span> — 플랜 이름과 읽기 요일을 설정합니다.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
                <span><span className="font-medium text-foreground">분량 등록</span> — 생성된 플랜을 클릭하여 엑셀로 날짜별 읽기 분량을 일괄 등록합니다.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
                <span><span className="font-medium text-foreground">부서 활성화</span> — 부서에 플랜과 운영 기간을 지정하면 앱 유저에게 매일 읽기 분량이 노출됩니다.</span>
              </li>
            </ol>
          </div>

          {/* 부서 플랜 현황 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">부서 플랜 현황</CardTitle>
            </CardHeader>
            <CardContent>
              {departments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">부서 데이터가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {departments.map((dept) => {
                    const isActive = !!dept.activePlanTitle;
                    return (
                      <div key={dept.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm">{dept.name}</span>
                          {isActive ? (
                            <Badge variant="secondary" className="text-xs">{dept.activePlanTitle}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">비활성</Badge>
                          )}
                        </div>
                        {isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive shrink-0"
                            onClick={() => handleDeactivate(dept.id, dept.name, dept.activePlanTitle!)}
                          >
                            비활성화
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                              setActivatingDept({ id: dept.id, name: dept.name });
                              setSelectedPlanId("");
                              setActivateStartDate("");
                              setActivateEndDate("");
                            }}
                          >
                            활성화
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 등록된 플랜 목록 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">등록된 플랜</CardTitle>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> 플랜 생성
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">등록된 플랜이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => openPlanDetail(plan)}
                      className="w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{plan.title}</p>
                        <p className="text-xs text-muted-foreground">
                          등록: {new Date(plan.createdAt).toLocaleDateString("ko-KR")} &middot; {readingDaysToLabel(plan.readingDays)}요일
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* 플랜 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>통독 플랜 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>플랜 제목</Label>
              <Input
                placeholder="예: 2026 창세기 통독"
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>읽기 요일</Label>
              <div className="flex gap-2">
                {DAY_LABELS.map((label, i) => {
                  const bit = 1 << i;
                  const checked = (createForm.readingDays & bit) !== 0;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setCreateForm((f) => ({
                          ...f,
                          readingDays: checked ? f.readingDays & ~bit : f.readingDays | bit,
                        }))
                      }
                      className={`h-9 w-9 rounded-full text-sm font-medium border transition-colors ${
                        checked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                선택: {readingDaysToLabel(createForm.readingDays) || "없음"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>취소</Button>
            <Button onClick={handleCreatePlan} disabled={saving || !createForm.title || createForm.readingDays === 0}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 플랜 상세 Sheet */}
      <Sheet open={planDetailSheet.open} onOpenChange={(o) => setPlanDetailSheet((s) => ({ ...s, open: o }))}>
        <SheetContent className="w-[520px] sm:w-[600px] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              {planDetailSheet.plan?.title}
            </SheetTitle>
            {planDetailSheet.plan && (
              <p className="text-xs text-muted-foreground">
                {readingDaysToLabel(planDetailSheet.plan.readingDays)}요일 &middot; 총 {planDays.length}일차 등록됨
              </p>
            )}
          </SheetHeader>

          <div className="mt-4 flex-1 overflow-y-auto space-y-4">
            {/* 일괄 등록 */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">일정 일괄 등록 (엑셀)</p>
                <Button variant="ghost" size="sm" onClick={downloadSampleExcel} className="text-xs h-7 px-2">
                  <Download className="h-3 w-3 mr-1" /> 샘플 다운로드
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                컬럼: 순서 (필수), 분량 (필수), 설명, 오디오링크(옵션), 비디오링크(옵션)
              </p>
              <p className="text-xs font-medium text-amber-500">
                ⚠ 컬럼 이름을 임의로 변경하면 업로드가 실패합니다.
              </p>
              <div className="relative">
                <input
                  ref={batchFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setDetailBatchFile(file);
                    if (file) handleDetailBatchUploadWithFile(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => batchFileInputRef.current?.click()}
                  className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  {saving
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> 업로드 중...</>
                    : "눌러서 파일을 선택하세요."}
                </button>
              </div>
            </div>

            {/* 등록된 일자 목록 */}
            {planDaysLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : planDays.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">등록된 일정이 없습니다.</p>
            ) : (
              <div className="space-y-1">
                {planDays.map((day) => {
                  const medias = dayMediaMap[day.id] ?? [];
                  const isUploading = uploadingDayId === day.id;
                  const isEditing = editingDayId === day.id;

                  if (isEditing) {
                    return (
                      <div key={day.id} className="rounded-lg border px-4 py-3 space-y-3 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary w-10 shrink-0">{day.dayNumber}일차</span>
                          <span className="text-xs text-muted-foreground">수정 중</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">분량 *</Label>
                            <Input
                              className="h-8 text-sm mt-1"
                              value={editForm.readingRange}
                              onChange={(e) => setEditForm((f) => ({ ...f, readingRange: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">설명</Label>
                            <Input
                              className="h-8 text-sm mt-1"
                              value={editForm.description}
                              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">오디오 URL</Label>
                              <Input
                                className="h-8 text-sm mt-1"
                                placeholder="https://..."
                                value={editForm.audioUrl}
                                onChange={(e) => setEditForm((f) => ({ ...f, audioUrl: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">영상 URL</Label>
                              <Input
                                className="h-8 text-sm mt-1"
                                placeholder="https://..."
                                value={editForm.videoUrl}
                                onChange={(e) => setEditForm((f) => ({ ...f, videoUrl: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>
                        {/* 사진 관리 */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">사진</Label>
                          <div className="flex flex-wrap gap-2">
                            {medias.map((m) => (
                              <div key={m.id} className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={m.url} alt=""
                                  className="h-16 w-16 rounded object-cover border cursor-zoom-in"
                                  onClick={() => setLightboxUrl(m.url)}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMedia(day.id, m.id)}
                                  className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => triggerImageUpload(day.id)}
                              disabled={isUploading}
                              className="h-16 w-16 rounded border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                            >
                              {isUploading
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <ImagePlus className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={cancelEditDay}>취소</Button>
                          <Button
                            size="sm"
                            onClick={() => saveEditDay(day.id)}
                            disabled={editSaving || !editForm.readingRange.trim()}
                          >
                            {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                            저장
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={day.id} className="rounded-lg border px-4 py-3 space-y-2">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-semibold text-primary mt-0.5 w-10 shrink-0">
                          {day.dayNumber}일차
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{day.readingRange}</p>
                          {day.description && (
                            <p className="text-xs text-muted-foreground truncate">{day.description}</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            {day.audioUrl && <span className="text-xs text-blue-500">오디오</span>}
                            {day.videoUrl && <span className="text-xs text-purple-500">영상</span>}
                            {medias.length > 0 && <span className="text-xs text-emerald-500">사진 {medias.length}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 shrink-0"
                          onClick={() => startEditDay(day)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 숨겨진 이미지 업로드 input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* 부서 플랜 활성화 다이얼로그 */}
      <Dialog open={!!activatingDept} onOpenChange={(o) => !o && setActivatingDept(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activatingDept?.name} 플랜 활성화</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>플랜 선택</Label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                <option value="">플랜을 선택하세요</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>운영 시작일</Label>
                <Input type="date" value={activateStartDate} onChange={(e) => setActivateStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>운영 종료일</Label>
                <Input type="date" value={activateEndDate} onChange={(e) => setActivateEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivatingDept(null)}>취소</Button>
            <Button
              onClick={handleActivate}
              disabled={saving || !selectedPlanId || !activateStartDate || !activateEndDate}
            >
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}활성화
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 라이트박스 */}
      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-0">
          {lightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightboxUrl} alt="" className="w-full h-auto max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(o) => !o && setConfirmDialog((d) => ({ ...d, open: false }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        mode={confirmDialog.mode}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}
