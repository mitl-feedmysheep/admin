"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { TimePickerInput } from "./time-picker-input";

interface TimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

export function TimePicker({ date, setDate }: TimePickerProps) {
  const minuteRef = React.useRef<HTMLInputElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <div className="grid gap-1 text-center">
        <Label htmlFor="hours" className="text-xs text-muted-foreground">
          시
        </Label>
        <TimePickerInput
          picker="hours"
          date={date}
          setDate={setDate}
          ref={hourRef}
          onRightFocus={() => minuteRef.current?.focus()}
        />
      </div>
      <span className="text-lg font-medium text-muted-foreground mt-5">:</span>
      <div className="grid gap-1 text-center">
        <Label htmlFor="minutes" className="text-xs text-muted-foreground">
          분
        </Label>
        <TimePickerInput
          picker="minutes"
          date={date}
          setDate={setDate}
          ref={minuteRef}
          onLeftFocus={() => hourRef.current?.focus()}
        />
      </div>
      <Clock className="ml-1 mt-5 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
