"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Home,
  ChevronLeft,
  Users,
  X,
  Search,
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
import { TimePicker } from "@/components/time-picker/time-picker";

function timeStringToDate(time: string): Date | undefined {
  if (!time) return undefined;
  const [h, m] = time.split(":").map(Number);
  return new Date(new Date().setHours(h, m, 0, 0));
}

function dateToTimeString(date: Date | undefined): string {
  if (!date) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toLocalDateTimeString(date: string, time: string): string {
  return `${date}T${time}:00`;
}

interface VisitListItem {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string;
  place: string;
  expense: number;
  notes: string | null;
  memberCount: number;
  members: { visitMemberId: string; name: string; memberId: string }[];
  createdAt: string;
}

interface VisitMember {
  id: string;
  churchMemberId: string;
  memberName: string;
  sex: string;
  birthday: string;
  story: string | null;
  prayers: {
    id: string;
    prayerRequest: string;
    description: string | null;
    isAnswered: boolean;
    createdAt: string;
  }[];
}

interface VisitDetail {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string;
  place: string;
  expense: number;
  notes: string | null;
  visitMembers: VisitMember[];
  createdAt: string;
}

interface SearchMember {
  id: string;
  churchMemberId: string;
  name: string;
  phone: string;
  primaryGroup: string;
}

export function VisitManageClient() {
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

  // List state
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [visits, setVisits] = useState<VisitListItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail state
  const [selectedVisit, setSelectedVisit] = useState<VisitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    place: "",
    expense: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Member editing state (story + prayers combined)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [storyDraft, setStoryDraft] = useState("");
  // 기존 기도제목 수정 추적 (id + text, 삭제는 제거)
  const [existingPrayerDrafts, setExistingPrayerDrafts] = useState<{ id: string; text: string }[]>([]);
  // 새로 추가할 기도제목 텍스트 목록
  const [newPrayerDrafts, setNewPrayerDrafts] = useState<string[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  // Add members dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);

  const dialogHistoryPushed = useRef(false);

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      window.history.pushState({ visitDialog: true }, "");
      dialogHistoryPushed.current = true;
    } else {
      if (dialogHistoryPushed.current) {
        dialogHistoryPushed.current = false;
        window.history.back();
      }
    }
    setDialogOpen(open);
  };

  const detailHistoryPushed = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      if (dialogOpen) {
        dialogHistoryPushed.current = false;
        setDialogOpen(false);
      } else if (selectedVisit) {
        detailHistoryPushed.current = false;
        setSelectedVisit(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [dialogOpen, selectedVisit]);

  const fetchVisits = useCallback(
    async (year: number, month: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/visits?year=${year}&month=${month}`,
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setVisits(data.data.visits);
        }
      } catch {
        console.error("심방 목록 불러오기 실패");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchVisits(viewDate.year, viewDate.month);
  }, [viewDate, fetchVisits]);

  const fetchDetail = async (visitId: string, pushHistory = true) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/visits/${visitId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedVisit(data.data);
        if (pushHistory && !detailHistoryPushed.current) {
          window.history.pushState({ visitDetail: true }, "");
          detailHistoryPushed.current = true;
        }
      }
    } catch {
      showAlert("오류", "심방 상세 정보를 불러오지 못했습니다.", "danger");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (
      !form.date ||
      !form.startTime ||
      !form.endTime ||
      !form.place.trim()
    )
      return;

    setSaving(true);
    try {
      const payload = {
        date: form.date,
        startedAt: toLocalDateTimeString(form.date, form.startTime),
        endedAt: toLocalDateTimeString(form.date, form.endTime),
        place: form.place,
        expense: form.expense ? Number(form.expense) : 0,
        notes: form.notes || undefined,
      };

      const url = editingId ? `/api/visits/${editingId}` : "/api/visits";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        handleDialogOpenChange(false);
        setEditingId(null);
        setForm({
          date: "",
          startTime: "",
          endTime: "",
          place: "",
          expense: "",
          notes: "",
        });
        fetchVisits(viewDate.year, viewDate.month);
        if (selectedVisit && editingId) {
          fetchDetail(editingId, false);
        }
        showAlert(
          editingId ? "심방 수정 완료" : "심방 생성 완료",
          editingId
            ? "심방이 수정되었습니다."
            : "새 심방이 생성되었습니다.",
          "success",
        );
      } else {
        const err = await res.json();
        showAlert("오류", err.error || "저장 실패", "danger");
      }
    } catch {
      showAlert("오류", "심방 저장 중 오류가 발생했습니다.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (visitId: string) => {
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedVisit?.id === visitId) setSelectedVisit(null);
        fetchVisits(viewDate.year, viewDate.month);
        showAlert("삭제 완료", "심방이 삭제되었습니다.", "success");
      }
    } catch {
      showAlert("오류", "심방 삭제 중 오류가 발생했습니다.", "danger");
    }
  };

  const handleRemoveMember = async (visitMemberId: string) => {
    if (!selectedVisit) return;
    try {
      const res = await fetch(
        `/api/visits/${selectedVisit.id}/members/${visitMemberId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        fetchDetail(selectedVisit.id, false);
        fetchVisits(viewDate.year, viewDate.month);
        showAlert("제거 완료", "멤버가 제거되었습니다.", "success");
      }
    } catch {
      showAlert("오류", "멤버 제거 중 오류가 발생했습니다.", "danger");
    }
  };

  const startEditing = (vm: VisitMember) => {
    setEditingMemberId(vm.id);
    setStoryDraft(vm.story || "");
    setExistingPrayerDrafts(vm.prayers.map((p) => ({ id: p.id, text: p.prayerRequest })));
    setNewPrayerDrafts([""]);
  };

  const cancelEditing = () => {
    setEditingMemberId(null);
    setStoryDraft("");
    setExistingPrayerDrafts([]);
    setNewPrayerDrafts([]);
  };

  const handleSaveAll = async (vm: VisitMember) => {
    if (!selectedVisit) return;
    setSavingAll(true);
    try {
      // 1. 나눔 저장
      await fetch(
        `/api/visits/${selectedVisit.id}/members/${vm.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ story: storyDraft || null }),
        },
      );

      // 2. 삭제된 기존 기도제목 처리
      const remainingIds = new Set(existingPrayerDrafts.map((d) => d.id));
      for (const p of vm.prayers) {
        if (!remainingIds.has(p.id)) {
          await fetch(`/api/prayers/${p.id}`, { method: "DELETE" });
        }
      }

      // 3. 새 기도제목 생성
      for (const text of newPrayerDrafts) {
        if (text.trim()) {
          await fetch(
            `/api/visits/${selectedVisit.id}/members/${vm.id}/prayers`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prayerRequest: text.trim() }),
            },
          );
        }
      }

      cancelEditing();
      fetchDetail(selectedVisit.id, false);
    } catch {
      showAlert("오류", "저장 중 오류가 발생했습니다.", "danger");
    } finally {
      setSavingAll(false);
    }
  };

  const searchMembers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/members?q=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setSearchResults(
          data.data.members.map(
            (m: {
              id: string;
              churchMemberId: string;
              name: string;
              phone: string;
              primaryGroup: string;
            }) => ({
              id: m.id,
              churchMemberId: m.churchMemberId,
              name: m.name,
              phone: m.phone,
              primaryGroup: m.primaryGroup,
            }),
          ),
        );
      }
    } catch {
      console.error("멤버 검색 실패");
    } finally {
      setSearching(false);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedVisit || selectedMemberIds.length === 0) return;
    setAddingMembers(true);
    try {
      const res = await fetch(
        `/api/visits/${selectedVisit.id}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ churchMemberIds: selectedMemberIds }),
        },
      );
      if (res.ok) {
        setAddMemberOpen(false);
        setMemberSearch("");
        setSearchResults([]);
        setSelectedMemberIds([]);
        fetchDetail(selectedVisit.id, false);
        fetchVisits(viewDate.year, viewDate.month);
        showAlert("추가 완료", "멤버가 추가되었습니다.", "success");
      } else {
        const err = await res.json();
        showAlert("오류", err.error || "멤버 추가 실패", "danger");
      }
    } catch {
      showAlert("오류", "멤버 추가 중 오류가 발생했습니다.", "danger");
    } finally {
      setAddingMembers(false);
    }
  };

  const openNew = () => {
    setEditingId(null);
    const now = new Date();
    setForm({
      date: now.toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      place: "",
      expense: "",
      notes: "",
    });
    handleDialogOpenChange(true);
  };

  const openEdit = (visit: VisitDetail | VisitListItem) => {
    setEditingId(visit.id);
    const started = new Date(visit.startedAt);
    const ended = new Date(visit.endedAt);
    setForm({
      date: visit.date,
      startTime: `${String(started.getHours()).padStart(2, "0")}:${String(started.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(ended.getHours()).padStart(2, "0")}:${String(ended.getMinutes()).padStart(2, "0")}`,
      place: visit.place,
      expense: String(visit.expense),
      notes: visit.notes || "",
    });
    handleDialogOpenChange(true);
  };

  const prevMonth = () =>
    setViewDate((prev) => {
      const d = new Date(prev.year, prev.month - 2, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

  const nextMonth = () =>
    setViewDate((prev) => {
      const d = new Date(prev.year, prev.month, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  // Detail view
  if (selectedVisit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (detailHistoryPushed.current) {
                detailHistoryPushed.current = false;
                window.history.back();
              } else {
                setSelectedVisit(null);
              }
            }}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            목록
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            심방 상세
          </h1>
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Visit info card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedVisit.date} 심방
                    </CardTitle>
                    <CardDescription>{selectedVisit.place}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(selectedVisit)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        setDialogState({
                          open: true,
                          title: "심방 삭제",
                          description:
                            "이 심방을 삭제하시겠습니까? 관련 멤버와 기도제목도 함께 삭제됩니다.",
                          mode: "confirm",
                          variant: "danger",
                          confirmText: "삭제",
                          onConfirm: () => handleDelete(selectedVisit.id),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">날짜</p>
                    <p className="font-medium">{selectedVisit.date}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">시간</p>
                    <p className="font-medium">
                      {new Date(selectedVisit.startedAt).toLocaleTimeString(
                        "ko-KR",
                        { hour: "2-digit", minute: "2-digit" },
                      )}{" "}
                      ~{" "}
                      {new Date(selectedVisit.endedAt).toLocaleTimeString(
                        "ko-KR",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">장소</p>
                    <p className="font-medium">{selectedVisit.place}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">비용</p>
                    <p className="font-medium">
                      {selectedVisit.expense.toLocaleString()}원
                    </p>
                  </div>
                </div>
                {selectedVisit.notes && (
                  <div className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                    <p className="text-sm text-slate-500 mb-1">메모</p>
                    <p className="text-sm whitespace-pre-line">
                      {selectedVisit.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Visit members */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      심방 대상 ({selectedVisit.visitMembers.length}명)
                    </CardTitle>
                    <CardDescription>
                      심방 받은 성도 목록과 기도제목
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => setAddMemberOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    멤버 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedVisit.visitMembers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p>아직 추가된 멤버가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedVisit.visitMembers.map((vm) => {
                      const isEditing = editingMemberId === vm.id;
                      return (
                        <div
                          key={vm.id}
                          className="rounded-lg border p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {vm.memberName}
                              </span>
                              <span className="text-xs text-slate-500">
                                {vm.sex === "M" ? "형제" : "자매"} ·{" "}
                                {vm.birthday}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {!isEditing && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => startEditing(vm)}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  {vm.story || vm.prayers.length > 0 ? "수정" : "작성"}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                                onClick={() => {
                                  setDialogState({
                                    open: true,
                                    title: "멤버 제거",
                                    description: `${vm.memberName}님을 심방에서 제거하시겠습니까?`,
                                    mode: "confirm",
                                    variant: "danger",
                                    confirmText: "제거",
                                    onConfirm: () => handleRemoveMember(vm.id),
                                  });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {isEditing ? (
                            /* ── 편집 모드 ── */
                            <div className="space-y-4">
                              {/* 나눔 */}
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">나눔</p>
                                <Textarea
                                  value={storyDraft}
                                  onChange={(e) => setStoryDraft(e.target.value)}
                                  placeholder="나눔 내용을 입력하세요"
                                  maxLength={1000}
                                  className="text-sm h-24 resize-none overflow-y-auto"
                                  style={{ fieldSizing: "fixed" as never }}
                                />
                              </div>

                              {/* 기도제목 */}
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">기도제목</p>
                                <div className="space-y-2">
                                  {/* 기존 기도제목 */}
                                  {existingPrayerDrafts.map((draft, i) => (
                                    <div key={draft.id} className="flex items-center gap-2">
                                      <span className="shrink-0 text-blue-500 text-sm">•</span>
                                      <Input
                                        value={draft.text}
                                        onChange={(e) =>
                                          setExistingPrayerDrafts((prev) =>
                                            prev.map((d, j) => j === i ? { ...d, text: e.target.value } : d)
                                          )
                                        }
                                        className="text-sm h-8"
                                        maxLength={200}
                                      />
                                      <button
                                        type="button"
                                        className="shrink-0 text-slate-300 hover:text-red-500"
                                        onClick={() =>
                                          setExistingPrayerDrafts((prev) => prev.filter((_, j) => j !== i))
                                        }
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  {/* 새 기도제목 입력란 */}
                                  {newPrayerDrafts.map((text, i) => (
                                    <div key={`new-${i}`} className="flex items-center gap-2">
                                      <span className="shrink-0 text-indigo-400 text-sm">+</span>
                                      <Input
                                        value={text}
                                        onChange={(e) =>
                                          setNewPrayerDrafts((prev) =>
                                            prev.map((t, j) => j === i ? e.target.value : t)
                                          )
                                        }
                                        placeholder="기도제목을 입력하세요"
                                        className="text-sm h-8"
                                        maxLength={200}
                                        autoFocus={i > 0}
                                      />
                                      {newPrayerDrafts.length > 1 && (
                                        <button
                                          type="button"
                                          className="shrink-0 text-slate-300 hover:text-red-500"
                                          onClick={() =>
                                            setNewPrayerDrafts((prev) => prev.filter((_, j) => j !== i))
                                          }
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {/* + 버튼 */}
                                  <div className="flex justify-center">
                                    <button
                                      type="button"
                                      className="text-slate-400 hover:text-indigo-500 transition-colors"
                                      onClick={() => setNewPrayerDrafts((prev) => [...prev, ""])}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* 완료/취소 */}
                              <div className="flex gap-2 justify-end pt-1 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelEditing}
                                >
                                  취소
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={savingAll}
                                  onClick={() => handleSaveAll(vm)}
                                >
                                  {savingAll && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                  완료
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* ── 보기 모드 ── */
                            <div className="space-y-3">
                              {vm.story ? (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 mb-1">나눔</p>
                                  <div className="rounded bg-slate-50 dark:bg-slate-800/50 p-2">
                                    <p className="text-sm whitespace-pre-line">{vm.story}</p>
                                  </div>
                                </div>
                              ) : null}

                              {vm.prayers.length > 0 ? (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 mb-1">기도제목</p>
                                  <div className="space-y-1">
                                    {vm.prayers.map((p) => (
                                      <div
                                        key={p.id}
                                        className="flex items-start gap-2 text-sm"
                                      >
                                        <span
                                          className={`mt-0.5 shrink-0 ${p.isAnswered ? "text-green-500" : "text-blue-500"}`}
                                        >
                                          {p.isAnswered ? "✓" : "•"}
                                        </span>
                                        <span
                                          className={p.isAnswered ? "line-through text-slate-400" : ""}
                                        >
                                          {p.prayerRequest}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {!vm.story && vm.prayers.length === 0 && (
                                <p className="text-sm text-slate-300 dark:text-slate-600">
                                  작성 버튼을 눌러 나눔과 기도제목을 기록하세요.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Add member dialog */}
        <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
          <DialogContent className="sm:max-w-[480px] max-h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
              <DialogTitle>심방 대상 추가</DialogTitle>
              <DialogDescription>
                교회 멤버를 검색하여 심방 대상에 추가합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto px-6 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-10"
                  placeholder="이름, 전화번호로 검색"
                  value={memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    searchMembers(e.target.value);
                  }}
                />
              </div>
              {searching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              )}
              {!searching && searchResults.length > 0 && (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {searchResults.map((m) => {
                    const alreadyAdded =
                      selectedVisit.visitMembers.some(
                        (vm) => vm.churchMemberId === m.churchMemberId,
                      );
                    const isSelected = selectedMemberIds.includes(
                      m.churchMemberId,
                    );
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => {
                          setSelectedMemberIds((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== m.churchMemberId)
                              : [...prev, m.churchMemberId],
                          );
                        }}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          alreadyAdded
                            ? "opacity-40 cursor-not-allowed"
                            : isSelected
                              ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{m.name}</span>
                          {m.primaryGroup && (
                            <span className="ml-2 text-xs text-slate-500">
                              {m.primaryGroup}
                            </span>
                          )}
                        </div>
                        {alreadyAdded && (
                          <span className="text-xs text-slate-400">
                            추가됨
                          </span>
                        )}
                        {isSelected && !alreadyAdded && (
                          <span className="text-xs text-indigo-600">
                            선택됨
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {!searching &&
                memberSearch.trim() &&
                searchResults.length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-4">
                    검색 결과가 없습니다.
                  </p>
                )}
            </div>
            <DialogFooter className="px-6 pb-6 pt-0 shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setAddMemberOpen(false);
                  setMemberSearch("");
                  setSearchResults([]);
                  setSelectedMemberIds([]);
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleAddMembers}
                disabled={addingMembers || selectedMemberIds.length === 0}
              >
                {addingMembers && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {selectedMemberIds.length}명 추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-[480px] max-h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
              <DialogTitle>
                {editingId ? "심방 수정" : "새 심방 생성"}
              </DialogTitle>
              <DialogDescription>
                심방 정보를 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                <Label>날짜 *</Label>
                <Input
                  type="date"
                  lang="ko"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>시작 시간 *</Label>
                  <TimePicker
                    date={timeStringToDate(form.startTime)}
                    setDate={(d) =>
                      setForm((p) => ({
                        ...p,
                        startTime: dateToTimeString(d),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>종료 시간 *</Label>
                  <TimePicker
                    date={timeStringToDate(form.endTime)}
                    setDate={(d) =>
                      setForm((p) => ({
                        ...p,
                        endTime: dateToTimeString(d),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>장소 *</Label>
                <Input
                  value={form.place}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, place: e.target.value }))
                  }
                  placeholder="예: 성도 자택, 카페"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>비용 *</Label>
                <Input
                  type="number"
                  value={form.expense}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expense: e.target.value }))
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>메모</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="심방 관련 메모"
                  maxLength={1000}
                  rows={3}
                  className="h-20! resize-none overflow-y-auto"
                  style={{ fieldSizing: "fixed" as never }}
                />
              </div>
            </div>
            <DialogFooter className="px-6 pb-6 pt-0 shrink-0">
              <Button
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  !form.date ||
                  !form.startTime ||
                  !form.endTime ||
                  !form.place.trim() ||
                  false
                }
              >
                {saving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId ? "수정" : "생성"}
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

  // List view
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          심방 관리
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          심방을 생성하고 관리합니다
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">심방 목록</CardTitle>
              <CardDescription>
                월별 심방을 조회하고 관리할 수 있습니다.
              </CardDescription>
            </div>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" />
              심방 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              ← 이전
            </Button>
            <span className="text-base font-semibold min-w-[120px] text-center">
              {viewDate.year}년 {viewDate.month}월
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              다음 →
            </Button>
          </div>

          {/* Visit list */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Home className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p>이 달에 등록된 심방이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visits.map((v) => {
                const d = new Date(v.date + "T00:00:00");
                const started = new Date(v.startedAt);
                const ended = new Date(v.endedAt);
                return (
                  <div
                    key={v.id}
                    className="rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => fetchDetail(v.id)}
                  >
                    <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4">
                      <div className="flex flex-col items-center min-w-[44px] sm:min-w-[56px]">
                        <span className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
                          {d.getDate()}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-500 text-center">
                          ({WEEKDAYS[d.getDay()]})
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white">
                          {v.place}
                        </h4>
                        <div className="flex flex-wrap gap-2 sm:gap-3 mt-1 text-xs text-slate-500">
                          <span>
                            {started.toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            ~{" "}
                            {ended.toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span>{v.memberCount}명</span>
                          {v.expense > 0 && (
                            <span>{v.expense.toLocaleString()}원</span>
                          )}
                        </div>
                        {v.members.length > 0 && (
                          <p className="mt-1 text-xs text-slate-400 truncate">
                            {v.members.map((m) => m.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <div
                        className="flex gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            setDialogState({
                              open: true,
                              title: "심방 삭제",
                              description: `${v.date} ${v.place} 심방을 삭제하시겠습니까?`,
                              mode: "confirm",
                              variant: "danger",
                              confirmText: "삭제",
                              onConfirm: () => handleDelete(v.id),
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <DialogTitle>
              {editingId ? "심방 수정" : "새 심방 생성"}
            </DialogTitle>
            <DialogDescription>심방 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>날짜 *</Label>
              <Input
                type="date"
                lang="ko"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>시작 시간 *</Label>
                <TimePicker
                  date={timeStringToDate(form.startTime)}
                  setDate={(d) =>
                    setForm((p) => ({
                      ...p,
                      startTime: dateToTimeString(d),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>종료 시간 *</Label>
                <TimePicker
                  date={timeStringToDate(form.endTime)}
                  setDate={(d) =>
                    setForm((p) => ({
                      ...p,
                      endTime: dateToTimeString(d),
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>장소 *</Label>
              <Input
                value={form.place}
                onChange={(e) =>
                  setForm((p) => ({ ...p, place: e.target.value }))
                }
                placeholder="예: 성도 자택, 카페"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>비용 *</Label>
              <Input
                type="number"
                value={form.expense}
                onChange={(e) =>
                  setForm((p) => ({ ...p, expense: e.target.value }))
                }
                placeholder="0"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="심방 관련 메모"
                maxLength={1000}
                rows={3}
                className="h-20! resize-none overflow-y-auto"
                style={{ fieldSizing: "fixed" as never }}
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-0 shrink-0">
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.date ||
                !form.startTime ||
                !form.endTime ||
                !form.place.trim() ||
                !form.expense
              }
            >
              {saving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingId ? "수정" : "생성"}
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
