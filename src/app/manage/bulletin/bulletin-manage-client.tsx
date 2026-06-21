"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Trash2, Send, Clock, ImagePlus, X, Newspaper, CheckSquare, Square } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ConfirmDialogVariant } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface BulletinItem {
  id: string;
  title: string;
  body: string | null;
  sendAt: string;
  isSent: boolean;
  pushEnabled: boolean;
  createdAt: string;
}

interface MediaItem {
  id: string;
  url: string;
}

const currentYear = new Date().getFullYear();
const currentWeekNum = Math.ceil(new Date().getDate() / 7);
const years = [currentYear - 1, currentYear, currentYear + 1];
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const weeks = [1, 2, 3, 4, 5];
const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function BulletinImageSection({ bulletinId }: { bulletinId: string }) {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch(`/api/bulletins/${bulletinId}/media`);
      const json = await res.json();
      if (json.success) setImages(json.data);
    } catch {
      setImages([]);
    }
  }, [bulletinId]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      const presignRes = await fetch(`/api/bulletins/${bulletinId}/media/presign`, {
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

      const saveRes = await fetch(`/api/bulletins/${bulletinId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl }),
      });
      const saveJson = await saveRes.json();
      if (!saveJson.success) throw new Error(saveJson.error);

      setImages((prev) => [...prev, saveJson.data]);
    } catch {
      toast.error("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    try {
      await fetch(`/api/bulletins/${bulletinId}/media/${mediaId}`, { method: "DELETE" });
      setImages((prev) => prev.filter((m) => m.id !== mediaId));
    } catch {
      toast.error("이미지 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">주보 이미지 *</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
          이미지 추가
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          <span className="text-xs">클릭하여 주보 이미지를 업로드하세요</span>
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BulletinManageClient() {
  const [list, setList] = useState<BulletinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createId, setCreateId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [detailItem, setDetailItem] = useState<BulletinItem | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string;
    mode: "confirm" | "alert"; variant: ConfirmDialogVariant; onConfirm?: () => void;
  }>({ open: false, title: "", description: "", mode: "alert", variant: "info" });

  const [form, setForm] = useState({
    year: currentYear,
    month: new Date().getMonth() + 1,
    weekNum: currentWeekNum,
    body: "",
    pushEnabled: false,
    sendDate: "",
    sendHour: "09",
    sendMinute: "00",
  });

  const showAlert = (title: string, description: string, variant: ConfirmDialogVariant = "info") => {
    setConfirmDialog({ open: true, title, description, mode: "alert", variant, onConfirm: undefined });
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bulletins");
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
    setForm({
      year: currentYear,
      month: new Date().getMonth() + 1,
      weekNum: Math.ceil(new Date().getDate() / 7),
      body: "",
      pushEnabled: false,
      sendDate: "",
      sendHour: "09",
      sendMinute: "00",
    });
  };

  const previewTitle = `${form.year}년 ${form.month}월 ${form.weekNum}주차 주보`;

  const handleCreate = async () => {
    if (form.pushEnabled && !form.sendDate) {
      showAlert("입력 오류", "발송 예약 날짜를 선택해주세요.", "warning");
      return;
    }

    const sendAt = form.pushEnabled
      ? `${form.sendDate}T${form.sendHour}:${form.sendMinute}:00`
      : undefined;

    setSaving(true);
    try {
      const res = await fetch("/api/bulletins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: createId,
          year: form.year,
          month: form.month,
          weekNum: form.weekNum,
          body: form.body || null,
          pushEnabled: form.pushEnabled,
          sendAt,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCreateOpen(false);
        resetForm();
        fetchList();
        toast.success("주보가 등록되었습니다.");
      } else {
        showAlert("오류", json.error || "주보 등록에 실패했습니다.", "danger");
      }
    } catch {
      showAlert("오류", "주보 등록 중 오류가 발생했습니다.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    setTimeout(() => {
      setConfirmDialog({
        open: true,
        title: "주보 삭제",
        description: `"${title}"을 삭제하시겠습니까?`,
        mode: "confirm",
        variant: "danger",
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/bulletins/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (!json.success) {
              showAlert("오류", json.error || "삭제에 실패했습니다.", "danger");
              return;
            }
            setDetailItem(null);
            fetchList();
            toast.success("주보가 삭제되었습니다.");
          } catch {
            showAlert("오류", "삭제 중 오류가 발생했습니다.", "danger");
          }
        },
      });
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Newspaper className="h-5 w-5" />
        <h1 className="text-xl font-bold">주보 관리</h1>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            resetForm();
            setCreateId(crypto.randomUUID());
            setCreateOpen(true);
          }}
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" /> 주보 업로드
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            등록된 주보가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setDetailItem(item)}
            >
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Newspaper className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium truncate">{item.title}</span>
                  {item.pushEnabled && item.isSent && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      <Send className="mr-1 h-3 w-3" />발송 완료
                    </Badge>
                  )}
                  {item.pushEnabled && !item.isSent && (
                    <Badge variant="outline" className="shrink-0 text-xs">
                      <Clock className="mr-1 h-3 w-3" />예약 중
                    </Badge>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.title); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>주보 상세</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">제목</p>
                <p className="font-medium">{detailItem.title}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">등록일</p>
                <p className="text-sm">{formatDate(detailItem.createdAt)}</p>
              </div>
              {detailItem.body && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">내용</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{detailItem.body}</p>
                </div>
              )}
              {detailItem.pushEnabled && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">푸시 알림</p>
                  <p className="text-sm">{detailItem.isSent ? "발송 완료" : `${formatDate(detailItem.sendAt)} 예약 중`}</p>
                </div>
              )}
              <div className="h-px bg-border/50" />
              <BulletinImageSection bulletinId={detailItem.id} />
            </div>
          )}
          <DialogFooter className="gap-2">
            {detailItem && (
              <Button
                variant="destructive"
                onClick={() => handleDelete(detailItem.id, detailItem.title)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />삭제
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailItem(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 업로드 다이얼로그 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>주보 업로드</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <Label>주차 선택 *</Label>
                <p className="text-xs text-muted-foreground">오늘 기준 주차 자동 설정 · 월~일 기준</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {years.map((y) => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                  value={form.month}
                  onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {months.map((m) => <option key={m} value={m}>{m}월</option>)}
                </select>
                <select
                  value={form.weekNum}
                  onChange={(e) => setForm((f) => ({ ...f, weekNum: Number(e.target.value) }))}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {weeks.map((w) => <option key={w} value={w}>{w}주차</option>)}
                </select>
              </div>
              <div className="rounded-md bg-accent/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">제목 미리보기</p>
                <p className="text-sm font-medium">{previewTitle}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulletin-body">내용 (선택)</Label>
              <Textarea
                id="bulletin-body"
                placeholder="주보 내용을 입력하세요 (선택사항)"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                className="min-h-[180px] resize-none"
              />
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <button
                type="button"
                className="flex items-center gap-2"
                onClick={() => setForm((f) => ({ ...f, pushEnabled: !f.pushEnabled }))}
              >
                {form.pushEnabled
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium">푸시 알림 발송</span>
              </button>
              {form.pushEnabled ? (
                <div className="space-y-1.5 pl-6">
                  <Label className="text-xs">발송 예약 시각 *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={form.sendDate}
                      onChange={(e) => setForm((f) => ({ ...f, sendDate: e.target.value }))}
                      className="flex-1"
                    />
                    <select
                      value={form.sendHour}
                      onChange={(e) => setForm((f) => ({ ...f, sendHour: e.target.value }))}
                      className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {hours.map((h) => <option key={h} value={h}>{h}시</option>)}
                    </select>
                    <select
                      value={form.sendMinute}
                      onChange={(e) => setForm((f) => ({ ...f, sendMinute: e.target.value }))}
                      className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {minutes.map((m) => <option key={m} value={m}>{m}분</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="pl-6 text-xs text-muted-foreground">푸시 알림 없이 주보만 등록됩니다.</p>
              )}
            </div>

            <div className="h-px bg-border/50" />
            <BulletinImageSection bulletinId={createId} />
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
