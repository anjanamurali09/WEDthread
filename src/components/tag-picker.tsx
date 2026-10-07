import { useRef, useState } from "react";
import { Plus, ChevronDown, Check, Pencil } from "lucide-react";
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { CustomColorButton } from "@/components/custom-color";
import type { GuestTag } from "@/lib/wedding-hooks";

// A standalone palette for tags, independent of the app's own (confusingly
// named — "cherry"/"sage" are both blue) theme tokens. Labels here describe
// what the color actually looks like.
export const TAG_COLOR_PRESETS = [
  { label: "Sky", hex: "#7FA8D6" },
  { label: "Berry", hex: "#B76E93" },
  { label: "Coral", hex: "#E0805F" },
  { label: "Gold", hex: "#D9A441" },
  { label: "Sage", hex: "#6E9B72" },
  { label: "Lilac", hex: "#9B8FC7" },
  { label: "Rose", hex: "#D98A9A" },
  { label: "Slate", hex: "#6B7A8F" },
];

function hexAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}

export function TagChip({ tag, onRemove, className }: {
  tag: { name: string; color: string; emoji?: string | null };
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shadow-sm", className)}
      style={{
        backgroundColor: hexAlpha(tag.color, "1f"),
        borderColor: hexAlpha(tag.color, "66"),
        color: tag.color,
      }}
    >
      {tag.emoji && <span>{tag.emoji}</span>}
      {tag.name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 opacity-70 hover:opacity-100 cursor-pointer leading-none">×</button>
      )}
    </span>
  );
}

// Searchable, creatable, editable tag picker shared by the Guests filter bar
// and the per-guest tag editor — typing a name that doesn't exist always
// surfaces a "New tag" row (same pattern as a city field that lets you add
// one that isn't in the list yet), which opens a small emoji + color step.
// Each existing tag also has its own edit affordance (renaming propagates to
// every guest currently wearing that tag, handled by the caller's onUpdate).
export function TagPicker({ library, selected, onToggle, onCreate, onUpdate, onDelete, triggerLabel = "Add tag", autoSelectOnCreate = true, className }: {
  library: GuestTag[];
  selected: string[];
  onToggle: (name: string) => void;
  onCreate: (input: { name: string; color: string; emoji: string | null }) => Promise<void>;
  onUpdate: (id: string, oldName: string, input: { name: string; color: string; emoji: string | null }) => Promise<void>;
  // Optional: shows a "Delete tag" action while editing a tag.
  onDelete?: (id: string, name: string) => Promise<void> | void;
  triggerLabel?: string;
  // Filtering by a tag you just created would always show zero guests (none
  // have it yet), so the filter-bar usage passes false here; the per-guest
  // assign usage leaves it true so creating a tag also applies it right away.
  autoSelectOnCreate?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(TAG_COLOR_PRESETS[0].hex);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  // Where the cursor was in the name field right before the emoji picker opened —
  // clicking into the picker steals focus, so the input's own selectionStart is gone
  // by the time an emoji is actually picked; this is what lets the emoji land at
  // whatever point in the name the person had the cursor, not just appended at the end.
  const caretRef = useRef<number | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = q ? library.filter((t) => t.name.toLowerCase().includes(q)) : library;

  const resetDraft = () => { setCreating(false); setEditingId(null); setDraftName(""); setDraftColor(TAG_COLOR_PRESETS[0].hex); setShowEmojiPicker(false); };
  const close = () => { setOpen(false); setQuery(""); resetDraft(); };

  const startCreate = () => { setEditingId(null); setDraftName(query.trim()); setDraftColor(TAG_COLOR_PRESETS[0].hex); setCreating(true); };
  // A tag created before emoji became part of the name text still has its emoji in its
  // own field — folding it into the editable name here (rather than keeping it as a
  // separate always-prefixed value) is what makes it movable/removable like any other
  // character the next time this tag is edited.
  const startEdit = (t: GuestTag) => {
    setEditingId(t.id);
    setDraftName(t.emoji ? `${t.emoji} ${t.name}` : t.name);
    setDraftColor(t.color);
    setCreating(true);
  };

  const insertEmojiAtCaret = (emoji: string) => {
    const pos = caretRef.current ?? draftName.length;
    const next = draftName.slice(0, pos) + emoji + draftName.slice(pos);
    setDraftName(next);
    const newPos = pos + emoji.length;
    caretRef.current = newPos;
    // Restore focus + caret after the emoji so typing continues right where it landed,
    // instead of the input losing focus to the picker and the next keystroke jumping
    // to the end.
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.setSelectionRange(newPos, newPos);
    });
  };

  const confirmSave = async () => {
    const name = draftName.trim();
    if (!name) return;
    setSaving(true);
    if (editingId) {
      const original = library.find((t) => t.id === editingId);
      await onUpdate(editingId, original?.name ?? name, { name, color: draftColor, emoji: null });
    } else {
      await onCreate({ name, color: draftColor, emoji: null });
      if (autoSelectOnCreate) onToggle(name);
    }
    setSaving(false);
    setQuery("");
    resetDraft();
  };

  return (
    <div className={cn("relative", className)}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm cursor-pointer transition-colors",
          selected.length ? "bg-clay text-paper border-clay" : "border-line hover:bg-stone")}>
        <span className={cn("uppercase tracking-widest text-[10px]", selected.length ? "opacity-90" : "opacity-80")}>
          {selected.length ? `${selected.length} tag${selected.length === 1 ? "" : "s"}` : triggerLabel}
        </span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className={cn("absolute left-0 mt-2 z-20 rounded-2xl border border-line bg-pearl shadow-lg p-1.5", showEmojiPicker ? "w-[300px]" : "w-56")}>
            {!creating ? (
              <>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tags"
                  className="w-full rounded-xl border border-line bg-paper px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#7FA8D6]"
                />
                <div className="mt-1 max-h-44 overflow-y-auto">
                  {filtered.map((t) => {
                    const isOn = selected.includes(t.name);
                    return (
                      <div key={t.id} className="flex items-center gap-1">
                        <button type="button" onClick={() => onToggle(t.name)}
                          className="flex-1 min-w-0 flex items-center justify-between gap-2 px-1.5 py-1.5 text-xs rounded-xl hover:bg-blush-soft">
                          <TagChip tag={t} />
                          {isOn && <Check className="h-3.5 w-3.5 text-cherry shrink-0" />}
                        </button>
                        <button type="button" onClick={() => startEdit(t)} title="Edit tag"
                          className="p-1.5 text-muted-foreground hover:text-ink shrink-0 cursor-pointer">
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={startCreate}
                    className="w-full flex items-center gap-1.5 px-1.5 py-1.5 text-xs rounded-xl hover:bg-blush-soft text-clay">
                    <Plus className="h-3.5 w-3.5" /> New tag
                  </button>
                </div>
              </>
            ) : (
              <div className="p-0.5">
                <input
                  ref={nameInputRef}
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onSelect={(e) => { caretRef.current = e.currentTarget.selectionStart; }}
                  onBlur={(e) => { caretRef.current = e.currentTarget.selectionStart; }}
                  placeholder="Tag name"
                  className="w-full rounded-xl border border-line bg-paper px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#7FA8D6]"
                />
                <div className="flex items-center justify-between gap-1 mt-2">
                  {TAG_COLOR_PRESETS.map((c) => (
                    <button type="button" key={c.hex} title={c.label} onClick={() => setDraftColor(c.hex)}
                      className={cn("h-4 w-4 shrink-0 rounded-full border-2 cursor-pointer", draftColor === c.hex ? "border-ink" : "border-transparent")}
                      style={{ backgroundColor: c.hex }} />
                  ))}
                  <CustomColorButton className="h-4 w-4" value={draftColor} active={!TAG_COLOR_PRESETS.some((c) => c.hex === draftColor)} onChange={setDraftColor} />
                  {/* Inserts at wherever the cursor was in the name field, not just at the
                      start — the picker used to populate a separate always-prefixed emoji
                      field, which meant the emoji could only ever show up first. */}
                  <button type="button" title="Insert emoji" onClick={() => setShowEmojiPicker((v) => !v)}
                    className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full border border-line bg-stone text-[10px] leading-none cursor-pointer hover:bg-blush-soft", showEmojiPicker && "border-ink")}>
                    😊
                  </button>
                </div>

                <div className="mt-1.5">
                  {showEmojiPicker && (
                    <div className="mt-1.5" style={{
                      "--epr-emoji-size": "15px",
                      "--epr-emoji-padding": "3px",
                      "--epr-category-navigation-button-size": "18px",
                      "--epr-header-padding": "6px",
                      "--epr-search-input-height": "30px",
                    } as React.CSSProperties}>
                      <EmojiPicker
                        onEmojiClick={(d) => { insertEmojiAtCaret(d.emoji); setShowEmojiPicker(false); }}
                        autoFocusSearch
                        skinTonesDisabled
                        previewConfig={{ showPreview: false }}
                        emojiStyle={EmojiStyle.NATIVE}
                        width="100%"
                        height={280}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-2 space-y-1">
                  {editingId && onDelete && (
                    <button type="button" onClick={async () => {
                      const t = library.find((x) => x.id === editingId);
                      if (!t) return;
                      setSaving(true);
                      await onDelete(t.id, t.name);
                      setSaving(false);
                      resetDraft();
                    }}
                      className="w-full rounded-full border border-line px-2.5 py-1.5 text-xs text-destructive hover:bg-stone cursor-pointer">
                      Delete tag
                    </button>
                  )}
                  <button type="button" disabled={saving || !draftName.trim()} onClick={confirmSave}
                    className="w-full rounded-full bg-ink text-paper px-2.5 py-1.5 text-xs hover:bg-clay cursor-pointer disabled:opacity-60">
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
