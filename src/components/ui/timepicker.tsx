import { Clock, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TimePickerProps {
  /** 24-hour "HH:MM" string, matching what a native <input type="time"> would return. */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatLabel(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// 15-minute increments, "00:00" through "23:45" — same 24hr storage format the native
// time input already produced, just displayed as 12hr AM/PM in the trigger and options.
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const value = `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`;
  return { value, label: formatLabel(value) };
});

export function TimePicker({ value, onChange, placeholder = "Pick a time", className, disabled }: TimePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start rounded-2xl border border-line bg-paper px-4 py-3 text-sm font-normal hover:bg-cream hover:text-ink focus-visible:ring-2 focus-visible:ring-clay",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="mr-2 h-4 w-4 text-clay" />
          {value ? formatLabel(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 max-h-64 overflow-y-auto rounded-2xl border border-line bg-pearl shadow-lg p-1.5">
        {TIME_OPTIONS.map((o) => (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-blush-soft cursor-pointer flex items-center justify-between gap-2",
              value === o.value && "font-medium",
            )}
          >
            <span>{o.label}</span>
            {value === o.value && <Check className="h-3.5 w-3.5 text-sage-deep shrink-0" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
