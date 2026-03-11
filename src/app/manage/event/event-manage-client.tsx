"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Trash2, CalendarIcon, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ConfirmDialogVariant } from "@/components/confirm-dialog";
import { TimePicker } from "@/components/time-picker/time-picker";

function timeStringToDate(time: string): Date | undefined {
  if (!time) return undefined;
  const [h, m] = time.split(":").map(Number);
  const d = new Date(new Date().setHours(h, m, 0, 0));
  return d;
}

function dateToTimeString(date: Date | undefined): string {
  if (!date) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const EVENT_COLOR_MAP: Record<string, string> = {
  PEACOCK: "#039BE5",
  TOMATO: "#D50000",
  SAGE: "#33B679",
  TANGERINE: "#F4511E",
  LAVENDER: "#7986CB",
  FLAMINGO: "#E67C73",
  BANANA: "#F09300",
  GRAPHITE: "#616161",
};

interface EventItem {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  color?: string;
}

export function EventManageClient() {
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

  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [eventList, setEventList] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", startDate: "", endDate: "", description: "", startTime: "", endTime: "", location: "",
  });
  const [saving, setSaving] = useState(false);
  const dialogHistoryPushed = useRef(false);

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      window.history.pushState({ eventDialog: true }, "");
      dialogHistoryPushed.current = true;
    } else {
      if (dialogHistoryPushed.current) {
        dialogHistoryPushed.current = false;
        window.history.back();
      }
    }
    setDialogOpen(open);
  };

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (dialogOpen) {
        dialogHistoryPushed.current = false;
        setDialogOpen(false);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [dialogOpen]);

  const fetchEvents = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?year=${year}&month=${month}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setEventList(data.data.events);
      }
    } catch {
      console.error("이벤트 목록 불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(viewDate.year, viewDate.month);
  }, [viewDate, fetchEvents]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.startDate) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        description: form.description || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        location: form.location || undefined,
      };

      const url = editingId ? `/api/events/${editingId}` : "/api/events";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        handleDialogOpenChange(false);
        setEditingId(null);
        setForm({ title: "", startDate: "", endDate: "", description: "", startTime: "", endTime: "", location: "" });
        fetchEvents(viewDate.year, viewDate.month);
        showAlert(
          editingId ? "이벤트 수정 완료" : "이벤트 생성 완료",
          editingId ? "이벤트가 수정되었습니다." : "새 이벤트가 생성되었습니다.",
          "success",
        );
      } else {
        const err = await res.json();
        showAlert("오류", err.error || "저장 실패", "danger");
      }
    } catch {
      showAlert("오류", "이벤트 저장 중 오류가 발생했습니다.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (res.ok) {
        fetchEvents(viewDate.year, viewDate.month);
        showAlert("삭제 완료", "이벤트가 삭제되었습니다.", "success");
      }
    } catch {
      showAlert("오류", "이벤트 삭제 중 오류가 발생했습니다.", "danger");
    }
  };

  const openEdit = (ev: EventItem) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      startDate: ev.startDate,
      endDate: ev.endDate,
      description: ev.description || "",
      startTime: ev.startTime || "",
      endTime: ev.endTime || "",
      location: ev.location || "",
    });
    handleDialogOpenChange(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ title: "", startDate: "", endDate: "", description: "", startTime: "", endTime: "", location: "" });
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

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">이벤트 관리</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          교회 캘린더 이벤트를 관리합니다
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">교회 일정</CardTitle>
              <CardDescription>월별 이벤트를 조회하고 관리할 수 있습니다.</CardDescription>
            </div>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" />
              이벤트 추가
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

          {/* Event list */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : eventList.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CalendarIcon className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p>이 달에 등록된 이벤트가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventList.map((ev) => {
                const sd = new Date(ev.startDate + "T00:00:00");
                const ed = new Date(ev.endDate + "T00:00:00");
                const isMultiDay = ev.startDate !== ev.endDate;
                const isExpanded = expandedId === ev.id;
                return (
                  <div
                    key={ev.id}
                    className="rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer"
                      onClick={() => toggleExpand(ev.id)}
                    >
                      <div className="flex flex-col items-center w-[52px] shrink-0">
                        <span className={`font-bold text-slate-800 dark:text-white ${isMultiDay ? "text-sm sm:text-lg" : "text-base sm:text-lg"}`}>
                          {isMultiDay ? (
                            <span className="hidden sm:grid grid-cols-[1fr_auto_1fr] text-center">
                              <span className="text-[9px] font-normal text-slate-400 leading-tight">{sd.getMonth() + 1}</span>
                              <span />
                              <span className="text-[9px] font-normal text-slate-400 leading-tight">{ed.getMonth() + 1}</span>
                              <span>{sd.getDate()}</span>
                              <span>~</span>
                              <span>{ed.getDate()}</span>
                            </span>
                          ) : null}
                          {isMultiDay ? (
                            <span className="sm:hidden">{sd.getDate()}~{ed.getDate()}</span>
                          ) : sd.getDate()}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-500 text-center">
                          ({WEEKDAYS[sd.getDay()]}{isMultiDay ? `~${WEEKDAYS[ed.getDay()]}` : ""})
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-1.5">
                          {ev.color && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: EVENT_COLOR_MAP[ev.color] || "#616161" }}
                            />
                          )}
                          {ev.title}
                        </h4>
                        <div className="flex flex-wrap gap-2 sm:gap-3 mt-1 text-xs text-slate-500">
                          {(ev.startTime || ev.endTime) && (
                            <span>🕐 {ev.startTime}{ev.endTime ? ` ~ ${ev.endTime}` : ""}</span>
                          )}
                          {ev.location && <span>📍 {ev.location}</span>}
                        </div>
                        {ev.description && !isExpanded && (
                          <p className="mt-1 text-xs text-slate-400 truncate">{ev.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(ev)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            setDialogState({
                              open: true,
                              title: "이벤트 삭제",
                              description: `"${ev.title}" 이벤트를 삭제하시겠습니까?`,
                              mode: "confirm",
                              variant: "danger",
                              confirmText: "삭제",
                              onConfirm: () => handleDelete(ev.id),
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {isExpanded && ev.description && (
                      <div className="border-t px-3 sm:px-4 py-3 ml-[56px] sm:ml-[72px]">
                        <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-400 line-clamp-4">
                          {ev.description}
                        </p>
                      </div>
                    )}
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
            <DialogTitle>{editingId ? "이벤트 수정" : "새 이벤트 추가"}</DialogTitle>
            <DialogDescription>교회 캘린더에 표시될 이벤트 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="예: 주일예배, 수련회"
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-4">
              <div className="space-y-2">
                <Label>시작 날짜 *</Label>
                <Input
                  type="date"
                  lang="ko"
                  className="px-1 sm:px-3 text-sm h-7 sm:h-10 text-center sm:text-left"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>종료 날짜</Label>
                <Input
                  type="date"
                  lang="ko"
                  className="px-1 sm:px-3 text-sm h-7 sm:h-10 text-center sm:text-left"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>시작 시간</Label>
                <TimePicker
                  date={timeStringToDate(form.startTime)}
                  setDate={(d) => setForm((p) => ({ ...p, startTime: dateToTimeString(d) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>종료 시간</Label>
                <TimePicker
                  date={timeStringToDate(form.endTime)}
                  setDate={(d) => setForm((p) => ({ ...p, endTime: dateToTimeString(d) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>장소</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="예: 본당, 소예배실"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="이벤트 상세 내용"
                maxLength={500}
                rows={3}
                className="!h-20 resize-none overflow-y-auto"
                style={{ fieldSizing: "fixed" }}
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-0 shrink-0">
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.startDate}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm/Alert dialog */}
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

