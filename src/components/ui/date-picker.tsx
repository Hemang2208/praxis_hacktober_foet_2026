"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "Select date",
  disabled,
}: DatePickerProps) {
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    try {
      // Split YYYY-MM-DD and create a date object in local timezone to avoid timezone shift issues
      const parts = value.split("-");
      if (parts.length !== 3) return undefined;
      
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed month
      const day = parseInt(parts[2], 10);
      
      const parsed = new Date(year, month, day);
      if (isNaN(parsed.getTime())) return undefined;
      return parsed;
    } catch {
      return undefined;
    }
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange?.("");
      return;
    }
    // format back to YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    onChange?.(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal border-zinc-200 dark:border-zinc-800 bg-background text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 shadow-sm transition-all duration-200",
            !value && "text-zinc-400 dark:text-zinc-500",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
          <span className="truncate">
            {dateValue ? format(dateValue, "PPP") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border border-zinc-200 dark:border-zinc-800 bg-popover rounded-xl shadow-lg" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
