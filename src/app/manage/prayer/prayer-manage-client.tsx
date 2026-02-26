"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Loader2,
  Trash2,
  BookOpen,
  Check,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ConfirmDialog,
  ConfirmDialogVariant,
} from "@/components/confirm-dialog";

interface PrayerItem {
  id: string;
  prayerRequest: string;
  description: string | null;
  isAnswered: boolean;
  createdAt: string;
}

interface GroupPrayerGathering {
  gatheringId: string;
  gatheringName: string;
  gatheringDate: string;
  groupId: string;
  groupName: string;
  members: {
    memberName: string;
    memberRole: string;
    memberBirthday: string;
    prayers: PrayerItem[];
  }[];
}

interface VisitPrayerGroup {
  visitId: string;
  visitDate: string;
  place: string;
  members: {
    memberName: string;
    prayers: PrayerItem[];
  }[];
}

interface GroupOption {
  id: string;
  name: string;
}

type FilterType = "all" | "praying" | "answered";

export function PrayerManageClient() {
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

  const showAlert = (
    title: string,
    description: string,
    variant: ConfirmDialogVariant = "info",
  ) => {
    setDialogState({
      open: true,
      title,
      description,
      mode: "alert",
      variant,
    });
  };

  const [activeTab, setActiveTab] = useState("my");

  // My prayers state
  const [myPrayers, setMyPrayers] = useState<PrayerItem[]>([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myFilter, setMyFilter] = useState<FilterType>("all");

  // Group prayers state
  const [groupPrayers, setGroupPrayers] = useState<GroupPrayerGathering[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupFilter, setGroupFilter] = useState<FilterType>("all");
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [groupDate, setGroupDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // Visit prayers state
  const [visitPrayers, setVisitPrayers] = useState<VisitPrayerGroup[]>([]);
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitFilter, setVisitFilter] = useState<FilterType>("all");
  const [visitDate, setVisitDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    prayerRequest: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState<PrayerItem | null>(null);
  const [editForm, setEditForm] = useState({
    prayerRequest: "",
    description: "",
  });

  // Fetch my prayers
  const fetchMyPrayers = useCallback(async (filter: FilterType) => {
    setMyLoading(true);
    try {
      const res = await fetch(`/api/prayers?tab=my&filter=${filter}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMyPrayers(data.data.prayers);
      }
    } catch {
      console.error("기도제목 불러오기 실패");
    } finally {
      setMyLoading(false);
    }
  }, []);

  // Fetch groups list
  const fetchGroups = useCallback(async (year: number) => {
    try {
      const res = await fetch(`/api/groups?year=${year}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setGroups(
          data.data.groups.map((g: { id: string; name: string }) => ({
            id: g.id,
            name: g.name,
          })),
        );
      }
    } catch {
      console.error("소그룹 목록 불러오기 실패");
    }
  }, []);

  // Fetch group prayers
  const fetchGroupPrayers = useCallback(
    async (
      filter: FilterType,
      gId: string,
      year: number,
      month: number,
    ) => {
      setGroupLoading(true);
      try {
        let url = `/api/prayers?tab=group&filter=${filter}&year=${year}&month=${month}`;
        if (gId) url += `&groupId=${gId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && data.success) {
          setGroupPrayers(data.data.gatherings);
        }
      } catch {
        console.error("소모임 기도제목 불러오기 실패");
      } finally {
        setGroupLoading(false);
      }
    },
    [],
  );

  // Fetch visit prayers
  const fetchVisitPrayers = useCallback(
    async (filter: FilterType, year: number, month: number) => {
      setVisitLoading(true);
      try {
        const res = await fetch(
          `/api/prayers?tab=visit&filter=${filter}&year=${year}&month=${month}`,
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setVisitPrayers(data.data.visits);
        }
      } catch {
        console.error("심방 기도제목 불러오기 실패");
      } finally {
        setVisitLoading(false);
      }
    },
    [],
  );

  // 연도 변경 시 그룹 목록 다시 가져오고 선택 초기화
  useEffect(() => {
    if (activeTab === "group") {
      setSelectedGroupId("");
      fetchGroups(groupDate.year);
    }
  }, [activeTab, groupDate.year, fetchGroups]);

  useEffect(() => {
    if (activeTab === "my") {
      fetchMyPrayers(myFilter);
    } else if (activeTab === "group") {
      fetchGroupPrayers(
        groupFilter,
        selectedGroupId,
        groupDate.year,
        groupDate.month,
      );
    } else if (activeTab === "visit") {
      fetchVisitPrayers(visitFilter, visitDate.year, visitDate.month);
    }
  }, [
    activeTab,
    myFilter,
    groupFilter,
    selectedGroupId,
    groupDate,
    visitFilter,
    visitDate,
    fetchMyPrayers,
    fetchGroupPrayers,
    fetchVisitPrayers,
  ]);

  const handleCreate = async () => {
    if (!createForm.prayerRequest.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setCreateOpen(false);
        setCreateForm({ prayerRequest: "", description: "" });
        fetchMyPrayers(myFilter);
        showAlert("생성 완료", "기도제목이 등록되었습니다.", "success");
      } else {
        const err = await res.json();
        showAlert("오류", err.error || "생성 실패", "danger");
      }
    } catch {
      showAlert("오류", "기도제목 생성 중 오류가 발생했습니다.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAnswered = async (prayer: PrayerItem) => {
    try {
      const res = await fetch(`/api/prayers/${prayer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAnswered: !prayer.isAnswered }),
      });
      if (res.ok) {
        if (activeTab === "my") fetchMyPrayers(myFilter);
        else if (activeTab === "group")
          fetchGroupPrayers(
            groupFilter,
            selectedGroupId,
            groupDate.year,
            groupDate.month,
          );
        else if (activeTab === "visit")
          fetchVisitPrayers(visitFilter, visitDate.year, visitDate.month);
      }
    } catch {
      showAlert("오류", "상태 변경 중 오류가 발생했습니다.", "danger");
    }
  };

  const handleEdit = async () => {
    if (!editingPrayer || !editForm.prayerRequest.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/prayers/${editingPrayer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditOpen(false);
        setEditingPrayer(null);
        if (activeTab === "my") fetchMyPrayers(myFilter);
        else if (activeTab === "group")
          fetchGroupPrayers(
            groupFilter,
            selectedGroupId,
            groupDate.year,
            groupDate.month,
          );
        else if (activeTab === "visit")
          fetchVisitPrayers(visitFilter, visitDate.year, visitDate.month);
        showAlert("수정 완료", "기도제목이 수정되었습니다.", "success");
      }
    } catch {
      showAlert("오류", "수정 중 오류가 발생했습니다.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (prayerId: string) => {
    try {
      const res = await fetch(`/api/prayers/${prayerId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (activeTab === "my") fetchMyPrayers(myFilter);
        else if (activeTab === "group")
          fetchGroupPrayers(
            groupFilter,
            selectedGroupId,
            groupDate.year,
            groupDate.month,
          );
        else if (activeTab === "visit")
          fetchVisitPrayers(visitFilter, visitDate.year, visitDate.month);
        showAlert("삭제 완료", "기도제목이 삭제되었습니다.", "success");
      }
    } catch {
      showAlert("오류", "삭제 중 오류가 발생했습니다.", "danger");
    }
  };

  const openEditDialog = (prayer: PrayerItem) => {
    setEditingPrayer(prayer);
    setEditForm({
      prayerRequest: prayer.prayerRequest,
      description: prayer.description || "",
    });
    setEditOpen(true);
  };

  const FilterChips = ({
    value,
    onChange,
  }: {
    value: FilterType;
    onChange: (v: FilterType) => void;
  }) => (
    <div className="flex gap-2">
      {(
        [
          { key: "all", label: "전체" },
          { key: "praying", label: "기도중" },
          { key: "answered", label: "응답됨" },
        ] as const
      ).map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onChange(f.key)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === f.key
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  const PrayerCard = ({
    prayer,
    showActions = true,
    showCircle = true,
    showDate = true,
  }: {
    prayer: PrayerItem;
    showActions?: boolean;
    showCircle?: boolean;
    showDate?: boolean;
  }) => (
    <div className="flex items-start gap-3 rounded-lg border p-3 group">
      {showCircle && (showActions ? (
        <button
          type="button"
          onClick={() => handleToggleAnswered(prayer)}
          className={`mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
            prayer.isAnswered
              ? "border-green-500 bg-green-500 text-white"
              : "border-slate-300 hover:border-indigo-400"
          }`}
        >
          {prayer.isAnswered && <Check className="h-3 w-3" />}
        </button>
      ) : (
        <span
          className={`mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
            prayer.isAnswered
              ? "border-green-500 bg-green-500 text-white"
              : "border-slate-300"
          }`}
        >
          {prayer.isAnswered && <Check className="h-3 w-3" />}
        </span>
      ))}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${prayer.isAnswered ? "line-through text-slate-400" : "text-slate-800 dark:text-white"}`}
        >
          {prayer.prayerRequest}
        </p>
        {prayer.description && (
          <p className="mt-0.5 text-xs text-slate-500">
            {prayer.description}
          </p>
        )}
        {showDate && (
          <p className="mt-1 text-xs text-slate-400">
            {new Date(prayer.createdAt).toLocaleDateString("ko-KR")}
          </p>
        )}
      </div>
      {showActions && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => openEditDialog(prayer)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
            onClick={() => {
              setDialogState({
                open: true,
                title: "기도제목 삭제",
                description: "이 기도제목을 삭제하시겠습니까?",
                mode: "confirm",
                variant: "danger",
                confirmText: "삭제",
                onConfirm: () => handleDelete(prayer.id),
              });
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );

  const MonthNav = ({
    date,
    onChange,
  }: {
    date: { year: number; month: number };
    onChange: (d: { year: number; month: number }) => void;
  }) => (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const d = new Date(date.year, date.month - 2, 1);
          onChange({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }}
      >
        ← 이전
      </Button>
      <span className="text-base font-semibold min-w-[120px] text-center">
        {date.year}년 {date.month}월
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const d = new Date(date.year, date.month, 1);
          onChange({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }}
      >
        다음 →
      </Button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          기도제목 관리
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          나의 기도제목과 교회 전체 기도제목을 관리합니다
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="my">나의 기도제목</TabsTrigger>
          <TabsTrigger value="group">소모임별</TabsTrigger>
          <TabsTrigger value="visit">심방</TabsTrigger>
        </TabsList>

        {/* Tab 1: My Prayers */}
        <TabsContent value="my" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">나의 기도제목</CardTitle>
                  <CardDescription>
                    최고 관리자 전용 기도제목으로, 다른 사용자에게는 노출되지 않습니다.
                  </CardDescription>
                </div>
                <Button
                  className="gap-2"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  기도제목 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterChips value={myFilter} onChange={setMyFilter} />

              {myLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : myPrayers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p>기도제목이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myPrayers.map((p) => (
                    <PrayerCard key={p.id} prayer={p} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Group Prayers */}
        <TabsContent value="group" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">소모임별 기도제목</CardTitle>
              <CardDescription>
                소모임 모임에서 나온 기도제목을 조회합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <FilterChips
                  value={groupFilter}
                  onChange={setGroupFilter}
                />
                <select
                  value={groupDate.year}
                  onChange={(e) => setGroupDate((prev) => ({ ...prev, year: Number(e.target.value) }))}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  {[2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">전체 소그룹</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <MonthNav date={groupDate} onChange={setGroupDate} />

              {groupLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : groupPrayers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p>해당 조건의 기도제목이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // 사람별로 기도제목을 모아서 보여주기 (출처 포함)
                    type PrayerWithSource = PrayerItem & { source: string };
                    const roleOrder: Record<string, number> = { LEADER: 0, SUB_LEADER: 1, MEMBER: 2 };
                    const memberMap = new Map<string, { role: string; birthday: string; prayers: PrayerWithSource[] }>();
                    groupPrayers.forEach((g) => {
                      const source = g.gatheringDate.slice(2).replace(/-/g, "-");
                      g.members.forEach((m) => {
                        const prayersWithSource = m.prayers.map((p) => ({ ...p, source }));
                        const existing = memberMap.get(m.memberName);
                        if (existing) {
                          existing.prayers.push(...prayersWithSource);
                          if ((roleOrder[m.memberRole] ?? 99) < (roleOrder[existing.role] ?? 99)) {
                            existing.role = m.memberRole;
                          }
                        } else {
                          memberMap.set(m.memberName, {
                            role: m.memberRole,
                            birthday: m.memberBirthday,
                            prayers: prayersWithSource,
                          });
                        }
                      });
                    });
                    // LEADER > SUB_LEADER > MEMBER, 같은 역할 내에서는 나이 많은 순
                    const sorted = Array.from(memberMap.entries()).sort(([, a], [, b]) => {
                      const roleDiff = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
                      if (roleDiff !== 0) return roleDiff;
                      return a.birthday.localeCompare(b.birthday);
                    });
                    return sorted.map(([name, { role, prayers }]) => (
                      <div key={name} className="rounded-lg border">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-t-lg border-b flex items-center gap-2">
                          <span className="text-sm font-semibold">{name}</span>
                          {role === "LEADER" && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-medium">리더</span>
                          )}
                          {role === "SUB_LEADER" && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 font-medium">부리더</span>
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          {prayers.length === 0 ? (
                            <p className="text-sm text-slate-400">기도제목이 없습니다.</p>
                          ) : (
                            prayers.map((p) => (
                              <div key={p.id} className="flex items-start gap-3 rounded-lg border p-3">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${p.isAnswered ? "line-through text-slate-400" : "text-slate-800 dark:text-white"}`}>
                                    {p.prayerRequest}
                                  </p>
                                  {p.description && (
                                    <p className="mt-0.5 text-xs text-slate-500">{p.description}</p>
                                  )}
                                </div>
                                <span className="shrink-0 text-[11px] text-slate-400">{p.source}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Visit Prayers */}
        <TabsContent value="visit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">심방 기도제목</CardTitle>
              <CardDescription>
                심방에서 나온 기도제목을 조회합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterChips
                value={visitFilter}
                onChange={setVisitFilter}
              />

              <MonthNav date={visitDate} onChange={setVisitDate} />

              {visitLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : visitPrayers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p>해당 조건의 기도제목이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {visitPrayers.map((v) => (
                    <div key={v.visitId} className="rounded-lg border">
                      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-t-lg border-b">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {v.visitDate}
                          </span>
                          <span className="text-xs text-slate-500">
                            {v.place}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {v.members.map((m, mi) => (
                          <div key={mi}>
                            <p className="text-xs font-medium text-slate-500 mb-2">
                              {m.memberName}
                            </p>
                            <div className="space-y-2 pl-2">
                              {m.prayers.map((p) => (
                                <PrayerCard
                                  key={p.id}
                                  prayer={p}
                                  showActions={false}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create prayer dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>새 기도제목</DialogTitle>
            <DialogDescription>
              기도제목을 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>기도제목 *</Label>
              <Input
                value={createForm.prayerRequest}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    prayerRequest: e.target.value,
                  }))
                }
                placeholder="기도제목을 입력하세요"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                placeholder="추가 설명 (선택)"
                maxLength={100}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !createForm.prayerRequest.trim()}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit prayer dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>기도제목 수정</DialogTitle>
            <DialogDescription>
              기도제목을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>기도제목 *</Label>
              <Input
                value={editForm.prayerRequest}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    prayerRequest: e.target.value,
                  }))
                }
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                maxLength={100}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving || !editForm.prayerRequest.trim()}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialogState.open}
        onOpenChange={(open) =>
          setDialogState((prev) => ({ ...prev, open }))
        }
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
