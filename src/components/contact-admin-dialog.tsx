"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface ContactAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** 메시지에 포함될 요청 제목 (예: "소그룹 삭제 요청") */
  requestTitle: string;
  /** 대상 엔티티 유형 (예: "부서", "소그룹") */
  entityType?: string;
  /** 대상 엔티티 이름 (예: "청년부") */
  entityName?: string;
  /** 입력란 placeholder */
  placeholder?: string;
}

export function ContactAdminDialog({
  open,
  onOpenChange,
  title,
  description,
  requestTitle,
  entityType,
  entityName,
  placeholder = "요청 내용을 입력해주세요",
}: ContactAdminDialogProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("메시지를 입력해주세요.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/system/contact-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: requestTitle,
          message: message.trim(),
          entityType,
          entityName,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success("요청이 전송되었습니다.");
        setMessage("");
        onOpenChange(false);
      } else {
        toast.error(json.error || "요청 전송에 실패했습니다.");
      }
    } catch {
      toast.error("요청 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setMessage("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-slate-400 text-right">{message.length}/500</p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            취소
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="gap-2"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            보내기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
