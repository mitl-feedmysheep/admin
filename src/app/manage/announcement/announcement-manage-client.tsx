"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Trash2, Megaphone, Send, Clock, CheckSquare, Square } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ConfirmDialogVariant } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  sendAt: string;
  isSent: boolean;
  createdAt: string;
}

function formatDatetime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AnnouncementManageClient() {
  const [list, setList] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setForm({ title: "", body: "", sendDate: "", sendHour: "09", sendMinute: "00", createEvent: false, startDate: "", endDate: "" });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { showAlert("입력 오류", "제목을 입력해주세요.", "warning"); return; }
    if (!form.body.trim()) { showAlert("입력 오류", "내용을 입력해주세요.", "warning"); return; }
    if (!form.sendDate) { showAlert("입력 오류", "발송 예약 날짜를 선택해주세요.", "warning"); return; }
    if (form.createEvent && (!form.startDate || !form.endDate)) {
      showAlert("입력 오류", "캘린더 이벤트의 시작일과 종료일을 입력해주세요.", "warning"); return;
    }

    const sendAt = `${form.sendDate}T${form.sendHour}:${form.sendMinute}:00`;

    setSaving(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          body: form.body.trim(),
          sendAt,
          createEvent: form.createEvent,
          startDate: form.createEvent ? form.startDate : undefined,
          endDate: form.createEvent ? form.endDate : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDialogOpen(false);
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

  const handleDelete = (id: string, title: string) => {
    setConfirmDialog({
      open: true, title: "공지사항 삭제",
      description: `"${title}"을 삭제하시겠습니까?`,
      mode: "confirm", variant: "danger",
      onConfirm: async () => {
        try {
          await fetch(`/api/announcements/${id}`, { method: "DELETE" });
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
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} size="sm">
          <Plus className="mr-1 h-4 w-4" /> 공지사항 작성
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">등록된 공지사항이 없습니다.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{item.title}</span>
                    {item.isSent ? (
                      <Badge variant="secondary" className="shrink-0 text-xs"><Send className="mr-1 h-3 w-3" />발송 완료</Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-xs"><Clock className="mr-1 h-3 w-3" />예약 중</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">발송 예약: {formatDatetime(item.sendAt)}</p>
                </div>
                {!item.isSent && (
                  <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id, item.title)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 작성 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
            <div className="space-y-1.5">
              <Label>발송 예약 시각 *</Label>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>취소</Button>
            <Button onClick={handleSubmit} disabled={saving}>
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
