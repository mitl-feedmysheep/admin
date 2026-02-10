"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

export type ConfirmDialogVariant = "info" | "warning" | "success" | "danger";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** "confirm" = 확인+취소, "alert" = 확인만 */
  mode?: "confirm" | "alert";
  variant?: ConfirmDialogVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

const variantConfig: Record<
  ConfirmDialogVariant,
  { icon: React.ReactNode; buttonClass: string }
> = {
  info: {
    icon: <Info className="h-6 w-6 text-blue-500" />,
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  success: {
    icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    buttonClass: "bg-green-600 hover:bg-green-700 text-white",
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6 text-amber-500" />,
    buttonClass: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  danger: {
    icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  mode = "confirm",
  variant = "info",
  confirmText,
  cancelText = "취소",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];

  const defaultConfirmText =
    mode === "alert" ? "확인" : variant === "danger" ? "삭제" : "확인";

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              {config.icon}
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="text-sm whitespace-pre-line">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-2">
          {mode === "confirm" && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="min-w-[72px]"
            >
              {cancelText}
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={`min-w-[72px] ${config.buttonClass}`}
          >
            {loading ? "처리 중..." : confirmText || defaultConfirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
