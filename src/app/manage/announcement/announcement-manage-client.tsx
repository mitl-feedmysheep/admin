"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Trash2, Megaphone, Send, Clock, CheckSquare, Square, Pencil, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ConfirmDialogVariant } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  sendAt: string;
  isSent: boolean;
  pushEnabled: boolean;
  createdAt: string;
}

function formatDatetime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AnnouncementManageClient() {
  const [list, setList] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // 상세/수정 모달
  const [detailItem, setDetailItem] = useState<AnnouncementItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string;
    mode: "confirm" | "alert"; variant: ConfirmDialogVariant; onConfirm?: () => void;
  }>({ open: false, title: "", description: "", mode: "alert", variant: "info" });

  const [form, setForm] = useState({
    title: "",
    body: "",
    sendDate: "",
    sendHour: "09",
    sendMinute: "00",
    pushEnabled: false,
    createEvent: false,
    startDate: "",
    endDate: "",
  });

  const showAlert = (title: string, description: string, variant: ConfirmDialogVariant = "info") => {
    setConfirmDialog({ open: true, title, description, mode: "alert", variant, onConfirm: undefined });
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements");
      const json = await res.json();
      if (json.success) setList(json.data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const resetForm = () => {
    setForm({ title: "", body: "", sendDate: "", sendHour: "09", sendMinute: "00", pushEnabled: false, createEvent: false, startDate: "", endDate: "" });
  };

  const openDetail = (item: AnnouncementItem) => {
    setDetailItem(item);
    setEditing(false);
    setEditTitle(item.title);
    setEditBody(item.body);
  };

  const closeDetail = () => {
    setDetailItem(null);
    setEditing(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { showAlert("입력 오류", "제목을 입력해주세요.", "warning"); return; }
    if (!form.body.trim()) { showAlert("입력 오류", "내용을 입력해주세요.", "warning"); return; }
    if (form.pushEnabled && !form.sendDate) { showAlert("입력 오류", "발송 예약 날짜를 선택해주세요.", "warning"); return; }
    if (form.createEvent && (!form.startDate || !form.endDate)) {
      showAlert("입력 오류", "캘린더 이벤트의 시작일과 종료일을 입력해주세요.", "warning"); return;
    }

    const sendAt = form.pushEnabled
      ? `${form.sendDate}T${form.sendHour}:${form.sendMinute}:00`
      : new Date().toISOString().slice(0, 19);

    setSaving(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          body: form.body.trim(),
          sendAt,
          pushEnabled: form.pushEnabled,
          createEvent: form.createEvent,
          startDate: form.createEvent ? form.startDate : undefined,
          endDate: form.createEvent ? form.endDate : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCreateOpen(false);
        resetForm();
        fetchList();
      } else {
        showAlert("오류", json.error || "공지사항 생성에 실패했습니다.", "danger");
      }
    } catch {
      showAlert("오류", "공지사항 생성 중 오류가 발생했습니다.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editTitle.trim()) { showAlert("입력 오류", "제목을 입력해주세요.", "warning"); return; }
    if (!editBody.trim()) { showAlert("입력 오류", "내용을 입력해주세요.", "warning"); return; }
    if (!detailItem) return;

    setEditSaving(true);
    try {
      const res = await fetch(`/api/announcements/${detailItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), body: editBody.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        closeDetail();
        fetchList();
      } else {
        showAlert("오류", json.error || "수정에 실패했습니다.", "danger");
      }
    } catch {
      showAlert("오류", "공지사항 수정 중 오류가 발생했습니다.", "danger");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    setConfirmDialog({
      open: true, title: "공지사항 삭제",
      description: `"${title}"을 삭제하시겠습니까?`,
      mode: "confirm", variant: "danger",
      onConfirm: async () => {
        try {
          await fetch(`/api/announcements/${id}`, { method: "DELETE" });
          closeDetail();
          fetchList();
        } catch {
          showAlert("오류", "삭제 중 오류가 발생했습니다.", "danger");
        }
      },
    });
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "10", "20", "30", "40", "50"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          <h1 className="text-xl font-bold">공지사항 관리</h1>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} size="sm">
          <Plus className="mr-1 h-4 w-4" /> 공지사항 작성
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">등록된 공지사항이 없습니다.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {list.map((item) => (
            <Card key={item.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => openDetail(item)}>
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{item.title}</span>
                  {item.pushEnabled && item.isSent && (
                    <Badge variant="secondary" className="shrink-0 text-xs"><Send className="mr-1 h-3 w-3" />발송 완료</Badge>
                  )}
                  {item.pushEnabled && !item.isSent && (
                    <Badge variant="outline" className="shrink-0 text-xs"><Clock className="mr-1 h-3 w-3" />예약 중</Badge>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDatetime(item.createdAt)}</span>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.title); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 상세/수정 모달 */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              {editing ? "공지사항 수정" : "공지사항 상세"}
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-1.5">
                    <Label>제목 *</Label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>내용 *</Label>
                    <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={10} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">제목</p>
                    <p className="font-medium">{detailItem.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">내용</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{detailItem.body}</p>
                  </div>
                  {detailItem.pushEnabled && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">발송 예약</p>
                      <p className="text-sm">{formatDatetime(detailItem.sendAt)}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={editSaving}>취소</Button>
                <Button onClick={handleEditSave} disabled={editSaving}>
                  {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  저장
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={closeDetail}>닫기</Button>
                <Button onClick={() => setEditing(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />수정
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 작성 다이얼로그 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>공지사항 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>제목 *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="공지사항 제목" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>내용 *</Label>
              <Textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="공지사항 내용을 입력하세요." rows={5} />
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <button type="button" className="flex items-center gap-2"
                onClick={() => setForm((f) => ({ ...f, pushEnabled: !f.pushEnabled }))}>
                {form.pushEnabled
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium">푸시 알림 발송</span>
              </button>
              {form.pushEnabled ? (
                <div className="space-y-1.5 pl-6">
                  <Label className="text-xs">발송 예약 시각 *</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={form.sendDate}
                      onChange={(e) => setForm((f) => ({ ...f, sendDate: e.target.value }))}
                      className="flex-1" />
                    <select value={form.sendHour} onChange={(e) => setForm((f) => ({ ...f, sendHour: e.target.value }))}
                      className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {hours.map((h) => <option key={h} value={h}>{h}시</option>)}
                    </select>
                    <select value={form.sendMinute} onChange={(e) => setForm((f) => ({ ...f, sendMinute: e.target.value }))}
                      className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {minutes.map((m) => <option key={m} value={m}>{m}분</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="pl-6 text-xs text-muted-foreground">푸시 알림 없이 공지사항만 등록됩니다.</p>
              )}
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <button type="button" className="flex items-center gap-2"
                onClick={() => setForm((f) => ({ ...f, createEvent: !f.createEvent }))}>
                {form.createEvent
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium">캘린더 이벤트도 함께 생성</span>
              </button>
              {form.createEvent && (
                <div className="space-y-2 pl-6">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">시작일</Label>
                      <Input type="date" value={form.startDate}
                        onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <span className="pt-5 text-muted-foreground">~</span>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">종료일</Label>
                      <Input type="date" value={form.endDate}
                        onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ※ 공지사항 삭제 시 캘린더 이벤트는 삭제되지 않습니다. 별도로 삭제해주세요.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>취소</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog((s) => ({ ...s, open: false }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        mode={confirmDialog.mode}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}
