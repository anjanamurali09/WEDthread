import { useEffect, useRef } from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { cn } from "@/lib/utils";

function ToolbarButton({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      // Losing focus/selection before the click fires is what makes execCommand apply to
      // nothing — mousedown fires first, so preventing its default keeps the contentEditable
      // (and whatever text is selected in it) focused throughout. Same trick as notes.tsx.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      className="grid h-6 w-6 place-items-center rounded-md text-ink hover:bg-stone/60 cursor-pointer"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// Minimal reusable rich-text input — bold/italic/underline only, for section body text
// on the website editor. Deliberately not the notes.tsx editor: that one also handles
// bullet/numbered/checklist line conversion, which is notes-specific and stays there.
// Uncontrolled after the initial mount (same approach as notes.tsx's NoteEditor): edits go
// straight to the DOM via execCommand/typing, read back out via innerHTML and reported
// through onChange on blur and after every toolbar action.
export function RichTextField({ value, onChange, placeholder, className }: {
  value: string; onChange: (html: string) => void; placeholder?: string; className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
  }, []); // eslint-disable-line

  const readAndReport = () => onChange(ref.current?.innerHTML ?? "");

  const exec = (command: string) => {
    document.execCommand(command, false);
    ref.current?.focus();
    readAndReport();
  };

  return (
    <div className={cn("rounded-xl border border-line bg-pearl overflow-hidden focus-within:border-wine", className)}>
      <div className="flex items-center gap-0.5 border-b border-line/60 px-1.5 py-1">
        <ToolbarButton icon={Bold} label="Bold" onClick={() => exec("bold")} />
        <ToolbarButton icon={Italic} label="Italic" onClick={() => exec("italic")} />
        <ToolbarButton icon={Underline} label="Underline" onClick={() => exec("underline")} />
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={readAndReport}
        onBlur={readAndReport}
        onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
        data-placeholder={placeholder}
        className="min-h-[100px] px-3 py-2 text-sm focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground [&_p]:mb-3 [&_p:last-child]:mb-0"
      />
    </div>
  );
}
