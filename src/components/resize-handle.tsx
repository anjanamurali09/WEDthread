import { ChevronsLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared visual language for "this element is resizable" across the app — used by the
// seating canvas and its tables/fixtures/areas (drag-resize on pointer down).
export function ResizeHandle({ className, cursor = "cursor-nwse-resize", ...props }: React.ComponentPropsWithoutRef<"button"> & { cursor?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "grid h-6 w-6 place-items-center rounded-full bg-paper/90 border border-line text-muted-foreground hover:text-ink transition-colors",
        cursor,
        className,
      )}
      {...props}
    >
      <ChevronsLeftRight className="h-3.5 w-3.5" />
    </button>
  );
}
