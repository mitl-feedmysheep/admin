"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UsersRound, Loader2, GraduationCap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ConfirmDialogVariant } from "@/components/confirm-dialog";

interface NewcomerMember {
  groupMemberId: string;
  memberId: string;
  name: string;
  phone: string;
  birthday: string;
  sex: string;
  role: string;
  status: string;
  completedWeeks: number[];
}

interface NewcomerGroup {
  id: string;
  name: string;
  program: {
    id: string;
    name: string;
    totalWeeks: number;
    graduatedCount: number;
  } | null;
  members: NewcomerMember[];
  totalMembers: number;
}

interface TargetGroup {
  id: string;
  name: string;
}

export function NewcomerManageClient() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    title: string;
    description: string;
    mode: "confirm" | "alert";
    variant: ConfirmDialogVariant;
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    mode: "alert",
    variant: "info",
  });

  const showAlert = (title: string, description: string, variant: ConfirmDialogVariant = "info") => {
    setDialogState({ open: true, title, description, mode: "alert", variant });
  };

  const [newcomerGroups, setNewcomerGroups] = useState<NewcomerGroup[]>([]);
  const [newcomerSummary, setNewcomerSummary] = useState({ totalNewcomers: 0, totalGraduated: 0, totalInProgress: 0 });
  const [newcomerLoading, setNewcomerLoading] = useState(false);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));

  const [allGroups, setAllGroups] = useState<TargetGroup[]>([]);

  const [graduateDialogOpen, setGraduateDialogOpen] = useState(false);
  const [graduateTarget, setGraduateTarget] = useState<{ groupId: string; groupMemberId: string; memberName: string } | null>(null);
  const [graduateTargetGroupId, setGraduateTargetGroupId] = useState("");
  const [isGraduating, setIsGraduating] = useState(false);

  const fetchNewcomers = useCallback(async (year: string) => {
    setNewcomerLoading(true);
    try {
      const res = await fetch(`/api/newcomers?year=${year}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setNewcomerGroups(data.data.groups);
        setNewcomerSummary(data.data.summary);
      }
    } catch {
      console.error("새가족 현황 불러오기 실패");
    } finally {
      setNewcomerLoading(false);
    }
  }, []);

  const fetchAllGroups = useCallback(async (year: string) => {
    try {
      const res = await fetch(`/api/groups?year=${year}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAllGroups(data.data.groups.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })));
      }
    } catch {
      console.error("소그룹 목록 불러오기 실패");
    }
  }, []);

  useEffect(() => {
    fetchNewcomers(yearFilter);
    fetchAllGroups(yearFilter);
  }, [yearFilter, fetchNewcomers, fetchAllGroups]);

  const handleGraduate = async () => {
    if (!graduateTarget || !graduateTargetGroupId) return;
    setIsGraduating(true);
    try {
      const res = await fetch("/api/newcomers/graduate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: graduateTarget.groupId,
          groupMemberId: graduateTarget.groupMemberId,
          targetGroupId: graduateTargetGroupId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert("졸업 처리 실패", data.error || "졸업 처리에 실패했습니다.", "danger");
        return;
      }
      showAlert("졸업 완료", `${graduateTarget.memberName}님이 ${data.data.targetGroupName}(으)로 편성되었습니다.`, "info");
      setGraduateDialogOpen(false);
      setGraduateTarget(null);
      setGraduateTargetGroupId("");
      fetchNewcomers(yearFilter);
      fetchAllGroups(yearFilter);
    } catch {
      showAlert("오류", "졸업 처리 중 오류가 발생했습니다.", "danger");
    } finally {
      setIsGraduating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">새가족 관리</h1>
        <p className="text-slate-500 dark:text-slate-400">
          새가족 교육 현황을 확인하고 졸업을 관리합니다
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {yearFilter}년 새가족 현황
        </p>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: new Date().getFullYear() - 2025 + 1 }, (_, i) => {
              const y = String(new Date().getFullYear() - i);
              return <SelectItem key={y} value={y}>{y}년</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      {newcomerLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">불러오는 중...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">전체 새가족</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{newcomerSummary.totalNewcomers}명</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <UsersRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">졸업 완료</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{newcomerSummary.totalGraduated}명</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">교육 진행 중</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{newcomerSummary.totalInProgress}명</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Loader2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {newcomerGroups.length === 0 ? (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="py-12 text-center">
                <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">새가족부 그룹이 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            newcomerGroups.map((group) => {
              const membersOnly = group.members.filter((m) => m.role === "MEMBER");
              const activeMembers = membersOnly.filter((m) => m.status === "ACTIVE");
              const graduatedMembers = membersOnly.filter((m) => m.status === "GRADUATED");
              const leaders = group.members.filter((m) => m.role !== "MEMBER");
              return (
                <Card key={group.id} className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                          {group.name}
                          <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800">
                            새가족부
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {group.program ? `${group.program.name} · ${group.program.totalWeeks}주 과정` : "교육 프로그램 없음"}
                          {leaders.length > 0 && ` · 리더: ${leaders.map((l) => l.name).join(", ")}`}
                        </CardDescription>
                      </div>
                      {group.program && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          졸업 {group.program.graduatedCount}명
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {activeMembers.length === 0 && graduatedMembers.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">교육 대상 멤버가 없습니다.</p>
                    ) : (
                      <div className="space-y-3">
                        {activeMembers.map((member) => {
                          const totalWeeks = group.program?.totalWeeks || 0;
                          const completedCount = member.completedWeeks.length;
                          const progressPercent = totalWeeks > 0 ? Math.round((completedCount / totalWeeks) * 100) : 0;

                          return (
                            <div key={member.groupMemberId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-sm font-medium">
                                    {member.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white text-sm">{member.name}</p>
                                    <p className="text-xs text-slate-500">{member.phone || "-"}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right mr-2">
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{completedCount}/{totalWeeks}주</p>
                                    <p className="text-[10px] text-slate-400">{progressPercent}%</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                                    onClick={() => {
                                      setGraduateTarget({
                                        groupId: group.id,
                                        groupMemberId: member.groupMemberId,
                                        memberName: member.name,
                                      });
                                      setGraduateTargetGroupId("");
                                      setGraduateDialogOpen(true);
                                    }}
                                  >
                                    <GraduationCap className="h-3.5 w-3.5" />
                                    졸업
                                  </Button>
                                </div>
                              </div>
                              {totalWeeks > 0 && (
                                <div className="mt-2 space-y-1.5">
                                  <div className="flex gap-1">
                                    {Array.from({ length: totalWeeks }, (_, i) => {
                                      const weekNum = i + 1;
                                      const done = member.completedWeeks.includes(weekNum);
                                      return (
                                        <div
                                          key={weekNum}
                                          className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-semibold ${
                                            done
                                              ? "bg-emerald-500 text-white"
                                              : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                                          }`}
                                        >
                                          {weekNum}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                                    <div
                                      className="h-1.5 rounded-full bg-emerald-500 transition-all"
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {graduatedMembers.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 pt-2">
                              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                              <span className="text-xs text-slate-400">졸업 완료 ({graduatedMembers.length}명)</span>
                              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                            </div>
                            {graduatedMembers.map((member) => {
                              const totalWeeks = group.program?.totalWeeks || 0;
                              const completedCount = member.completedWeeks.length;

                              return (
                                <div key={member.groupMemberId} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 opacity-60">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                        <GraduationCap className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-slate-900 dark:text-white text-sm">{member.name}</p>
                                        <p className="text-xs text-slate-500">{member.phone || "-"}</p>
                                      </div>
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                      졸업 완료 · {completedCount}/{totalWeeks}주
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </>
      )}

      <Dialog open={graduateDialogOpen} onOpenChange={setGraduateDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              졸업 처리
            </DialogTitle>
            <DialogDescription>
              {graduateTarget?.memberName}님을 졸업 처리하고 새로운 소그룹에 편성합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>편성할 소그룹 선택 *</Label>
              <Select value={graduateTargetGroupId} onValueChange={setGraduateTargetGroupId}>
                <SelectTrigger><SelectValue placeholder="소그룹을 선택하세요" /></SelectTrigger>
                <SelectContent>
                  {allGroups
                    .filter((g) => g.id !== graduateTarget?.groupId)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">졸업 후 해당 소그룹의 일반멤버로 편성됩니다.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGraduateDialogOpen(false)} disabled={isGraduating}>
              취소
            </Button>
            <Button
              onClick={handleGraduate}
              disabled={!graduateTargetGroupId || isGraduating}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isGraduating ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
              {isGraduating ? "처리 중..." : "졸업 처리"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        title={dialogState.title}
        description={dialogState.description}
        mode={dialogState.mode}
        variant={dialogState.variant}
        confirmText={dialogState.confirmText}
        onConfirm={dialogState.onConfirm}
      />
    </div>
  );
}
