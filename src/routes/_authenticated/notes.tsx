import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding, useNotes, type Note } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Plus, Trash2, Check, Loader2, Bold, Strikethrough, List, ListOrdered, SquareCheckBig, ListIndentIncrease, ListIndentDecrease } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersistedState } from "@/hooks/use-persisted-state";

export const Route = createFileRoute("/_authenticated/notes")({ component: NotesPage });

const AUTOSAVE_MS = 800;

// note.content is stored as HTML (from the rich-text editor below) for any note saved
// since formatting was added, but older notes were saved as plain text with literal
// newlines — this strips either shape down to plain lines, purely for the title
// fallback / row preview, without touching what's actually stored.
function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// note.title is nullable — an explicit title the couple typed always wins; a note left
// untitled falls back to the first line of its own content, purely for display (list
// row + editor placeholder), without ever overwriting whatever's actually stored.
function displayTitle(note: Note): string {
  if (note.title?.trim()) return note.title.trim();
  const firstLine = stripHtml(note.content).split("\n").find((l) => l.trim().length > 0);
  return firstLine?.trim().slice(0, 80) || "New note";
}

function previewText(note: Note): string {
  const lines = stripHtml(note.content).split("\n").map((l) => l.trim()).filter(Boolean);
  // Skip the first line if it's effectively standing in as the title (no separate
  // title set) so the preview doesn't just repeat the row's own heading.
  const rest = note.title?.trim() ? lines : lines.slice(1);
  return rest.join(" ").slice(0, 140);
}

// Old plain-text notes have literal "\n" newlines and no markup; the editor renders
// HTML, so on first load a plain-text note needs escaping + newline-to-<br> conversion.
// A note already saved as HTML (contains a tag) is passed through untouched.
function toEditableHtml(content: string): string {
  if (/<[a-z][\s\S]*>/i.test(content)) return content;
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function formatEdited(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotesPage() {
  const { data: wedding, isLoading: weddingLoading } = useCurrentWedding();
  const { data: notes = [], isLoading: notesLoading } = useNotes(wedding?.id);
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const loading = weddingLoading || notesLoading;

  useEffect(() => {
    if (loading) return;
    if (selectedId && notes.some((n) => n.id === selectedId)) return;
    setSelectedId(notes[0]?.id ?? null);
  }, [loading, notes, selectedId]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notes", wedding?.id] });

  const newNote = async () => {
    if (!wedding) return;
    const { data, error } = await supabase.from("notes").insert({ wedding_id: wedding.id, content: "" }).select().single();
    if (error) return toast.error(error.message);
    await invalidate();
    setSelectedId(data.id);
  };

  // Instant delete (matches the app's existing low-stakes-deletion pattern — no confirm
  // modal), with a brief undo: since it's a real row delete, "undo" re-inserts a fresh
  // row with the same content rather than literally restoring the same id, which reads
  // the same to the couple and needs no extra schema (e.g. a soft-delete flag).
  const deleteNote = async (note: Note) => {
    if (selectedId === note.id) {
      const remaining = notes.filter((n) => n.id !== note.id);
      setSelectedId(remaining[0]?.id ?? null);
    }
    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (error) return toast.error(error.message);
    await invalidate();
    toast("Note deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          const { data, error: undoError } = await supabase
            .from("notes")
            .insert({ wedding_id: note.wedding_id, title: note.title, content: note.content })
            .select().single();
          if (undoError) return toast.error(undoError.message);
          await invalidate();
          setSelectedId(data.id);
        },
      },
    });
  };

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  if (!loading && !wedding) return null;

  return (
    <AppShell
      title="Notes"
      subtitle="A freeform space for anything that doesn't fit anywhere else. Vendor calls, ideas, reminders to yourself."
      actions={
        <button onClick={newNote} disabled={!wedding} className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
          <Plus className="h-4 w-4" /> New note
        </button>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <section className="warm-wash rounded-[40px] border border-line/60 px-6 md:px-12 py-10 text-center max-w-2xl mx-auto">
          <p className="text-sm uppercase tracking-[0.3em] text-cherry">Your notes</p>
          <h3 className="mt-2 font-serif text-3xl md:text-4xl leading-tight">Jot down anything</h3>
          <p className="mt-3 text-sm text-ink leading-relaxed">Vendor call notes, ideas for the reception, things to remember. Nothing here needs a category.</p>
          <button onClick={newNote} className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-clay cursor-pointer">
            <Plus className="h-4 w-4" /> Write your first note
          </button>
        </section>
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          <aside className="paper-card p-2 h-fit lg:sticky lg:top-6 lg:max-h-[calc(100vh-180px)] overflow-y-auto">
            <div className="space-y-1">
              {notes.map((n) => (
                <NoteRow key={n.id} note={n} active={n.id === selectedId} onSelect={() => setSelectedId(n.id)} onDelete={() => deleteNote(n)} />
              ))}
            </div>
          </aside>

          <div className="paper-card p-0 overflow-hidden min-h-[60vh]">
            {selected ? (
              <NoteEditor key={selected.id} note={selected} onSaved={invalidate} />
            ) : (
              <div className="h-full flex items-center justify-center p-10 text-sm text-muted-foreground">Select a note, or start a new one.</div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function NoteRow({ note, active, onSelect, onDelete }: { note: Note; active: boolean; onSelect: () => void; onDelete: () => void }) {
  const preview = previewText(note);
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative rounded-2xl px-4 py-3 cursor-pointer transition-colors",
        active ? "bg-blush-soft" : "hover:bg-stone/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-serif text-lg leading-tight truncate pr-6">{displayTitle(note)}</p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete note"
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-muted-foreground hover:text-cherry hover:bg-paper opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mt-1 truncate">
        {formatEdited(note.updated_at)}{preview ? ` · ${preview}` : ""}
      </p>
    </div>
  );
}

function ToolbarButton({ icon: Icon, label, onClick, active }: { icon: any; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      // Losing focus/selection before the click fires is what makes execCommand apply
      // to nothing — mousedown fires first, so preventing its default keeps the
      // contentEditable (and whatever text is selected in it) focused throughout.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={cn("grid h-7 w-7 place-items-center rounded-lg cursor-pointer", active ? "bg-ink text-paper" : "text-ink hover:bg-stone/60")}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function NoteEditor({ note, onSaved }: { note: Note; onSaved: () => void }) {
  const [title, setTitle] = useState(note.title ?? "");
  const [content, setContent] = useState(note.content);
  // Ticked checklist items are crossed out unless this is switched off (remembered in this browser).
  const [crossOutTicked, setCrossOutTicked] = usePersistedState<boolean>("wedthread.notes-cross-out", true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef({ title: note.title ?? "", content: note.content });
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Tracks the latest typed values via ref (not just state) so the unmount-flush effect
  // below can read them without closing over stale values from whenever the component
  // first mounted.
  // The note's HTML is read straight off the editor into a ref on every keystroke instead of into React state, so
  // typing and the list/checklist buttons do not re-render the whole editor each time. `content` (state) catches up
  // a moment later and only feeds the title placeholder.
  const contentRef = useRef(note.content);
  const latestRef = useRef({ title, content });
  latestRef.current = { title, content: contentRef.current };
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = async (t: string, c: string) => {
    if (t === lastSaved.current.title && c === lastSaved.current.content) return;
    setSaving(true);
    const { error } = await supabase.from("notes").update({ title: t.trim() || null, content: c }).eq("id", note.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    lastSaved.current = { title: t, content: c };
    setSavedAt(new Date());
    onSaved();
  };

  const scheduleSave = (t: string, c: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(t, c), AUTOSAVE_MS);
  };

  // Flush any unsaved changes on unmount — switching to another note unmounts this
  // component (it's keyed by note.id on the parent), so without this, the last few
  // debounced keystrokes before a switch would be silently lost. Fires a plain
  // fire-and-forget request rather than calling save() directly, since setting state
  // (setSaving/setSavedAt) after unmount would just warn for no benefit.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      const { title: t, content: c } = latestRef.current;
      if (t !== lastSaved.current.title || c !== lastSaved.current.content) {
        supabase.from("notes").update({ title: t.trim() || null, content: c }).eq("id", note.id).then();
      }
    };
  }, []); // eslint-disable-line

  // Seeded exactly once on mount, then never touched by React again — the editor is
  // fully uncontrolled from here on (edits go straight to the DOM via execCommand /
  // native typing, read back out on demand). This used to be a dangerouslySetInnerHTML
  // tied to the `note` prop instead: harmless in theory since the string was unchanged
  // on every re-render, but it meant every click/keystroke re-render was a chance for
  // the toolbar's formatting to visibly get re-applied rather than just staying put,
  // which is what read as a 1-2s lag before bold/strike/lists "took." Reading straight
  // off the ref removes that path entirely — nothing but this effect ever assigns innerHTML.
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = toEditableHtml(note.content);
  }, []); // eslint-disable-line

  const readAndSave = () => {
    const html = editorRef.current?.innerHTML ?? contentRef.current;
    contentRef.current = html;
    latestRef.current = { title: latestRef.current.title, content: html };
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => setContent(html), 500);
    scheduleSave(latestRef.current.title, html);
  };

  // execCommand acts on the current DOM selection inside editorRef; refocusing after
  // is what lets the cursor stay put for the next keystroke instead of jumping away.
  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    readAndSave();
  };

  const makeChecklistItem = (text: string) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "note-check";
    checkbox.setAttribute("contenteditable", "false");
    const label = document.createElement("span");
    label.className = "note-check-label";
    label.textContent = text;
    return { checkbox, label };
  };

  // Reads out the plain text of each "line" inside a cloned selection, regardless of
  // what it's currently formatted as — a <li> from a bullet/numbered list, an
  // existing checklist item's label, or just plain text separated by <br>s/block
  // boundaries. This is what lets converting a selection to a different format
  // (bullet -> checklist, checklist -> numbered, etc.) actually read the right text
  // instead of the raw, format-specific markup.
  const extractLines = (range: Range): string[] => {
    const frag = range.cloneContents();
    const checkLabels = frag.querySelectorAll(".note-check-label");
    if (checkLabels.length > 0) return Array.from(checkLabels).map((el) => (el.textContent ?? "").trim());
    const liEls = frag.querySelectorAll("li");
    if (liEls.length > 0) return Array.from(liEls).map((el) => (el.textContent ?? "").trim());
    const container = document.createElement("div");
    container.appendChild(frag);
    container.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    container.querySelectorAll("div, p").forEach((el) => el.append("\n"));
    return (container.textContent ?? "").split("\n").map((l) => l.trim());
  };

  // One handler for all three line-format buttons (bullet / numbered / checklist).
  // With no selection (just a blinking cursor), each format behaves as it always
  // did on its own line. With a real selection, every selected line — whatever it's
  // currently formatted as — is read out via extractLines and rebuilt fresh as the
  // target format, which is what makes "select two bullets, click checklist"
  // actually replace them instead of nesting one format inside the other.
  const applyLineFormat = (format: "bullet" | "number" | "checklist") => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (range.collapsed) {
      const startEl = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
      const inChecklist = startEl?.closest(".note-check-label") as HTMLElement | null;
      const inListItem = startEl?.closest("li") as HTMLLIElement | null;

      if (format === "checklist") {
        // The checklist button isn't how you add another checkbox (that's Enter) —
        // clicking it again while already inside one previously duplicated the
        // checkbox instead of doing nothing, which is the "glitch" this guards.
        if (inChecklist) return;
        if (inListItem) {
          // Cursor is inside an existing bullet/numbered line: replace that <li> (and
          // its marker) with a checkbox rather than inserting one alongside the text,
          // which used to leave both a bullet AND a checkbox on the same line.
          const text = (inListItem.textContent ?? "").trim();
          const listParent = inListItem.parentElement;
          const { checkbox, label } = makeChecklistItem(text);
          inListItem.replaceWith(checkbox, label);
          if (listParent && listParent.children.length === 0) listParent.remove();
          const caret = document.createRange();
          caret.selectNodeContents(label);
          caret.collapse(false);
          sel.removeAllRanges();
          sel.addRange(caret);
          readAndSave();
          return;
        }
        range.deleteContents();
        const { checkbox, label } = makeChecklistItem("");
        const frag = document.createDocumentFragment();
        frag.appendChild(checkbox);
        frag.appendChild(label);
        range.insertNode(frag);
        const caret = document.createRange();
        caret.setStart(label, 0);
        caret.collapse(true);
        sel.removeAllRanges();
        sel.addRange(caret);
      } else if (inChecklist) {
        // Symmetric case: cursor is inside an existing checklist item and the couple
        // clicks Bullet/Numbered — replace the checkbox+label with a real <li> instead
        // of leaving the checkbox stuck next to a newly-created list.
        const checkbox = inChecklist.previousElementSibling as HTMLInputElement | null;
        const text = (inChecklist.textContent ?? "").trim();
        const listEl = document.createElement(format === "bullet" ? "ul" : "ol");
        const li = document.createElement("li");
        li.textContent = text;
        listEl.appendChild(li);
        const next = inChecklist.nextSibling;
        if (next && next.nodeName === "BR") next.remove();
        inChecklist.replaceWith(listEl);
        checkbox?.remove();
        const caret = document.createRange();
        caret.selectNodeContents(li);
        caret.collapse(false);
        sel.removeAllRanges();
        sel.addRange(caret);
      } else {
        document.execCommand(format === "bullet" ? "insertUnorderedList" : "insertOrderedList");
      }
      readAndSave();
      return;
    }

    const lines = extractLines(range).filter((l) => l.length > 0);
    if (document.queryCommandState("insertUnorderedList")) document.execCommand("insertUnorderedList");
    if (document.queryCommandState("insertOrderedList")) document.execCommand("insertOrderedList");

    const sel2 = window.getSelection();
    const range2 = sel2 && sel2.rangeCount > 0 ? sel2.getRangeAt(0) : range;

    // A click-drag selection that starts on visible text (e.g. clicking right before
    // "Yes") anchors its range INSIDE that checklist item's label — a checkbox <input>
    // isn't selectable text, so it never becomes part of the range even though it
    // visually sits right before the selection. Left as-is, deleteContents() below
    // would remove every label's text but skip that one leading checkbox, orphaning
    // it above the converted list. Widen the range to include it.
    const startEl2 = range2.startContainer instanceof Element ? range2.startContainer : range2.startContainer.parentElement;
    const startLabel = startEl2?.closest(".note-check-label");
    const leadingCheckbox = startLabel?.previousElementSibling;
    if (leadingCheckbox instanceof HTMLInputElement) range2.setStartBefore(leadingCheckbox);

    range2.deleteContents();

    if (format === "checklist") {
      const frag = document.createDocumentFragment();
      let lastLabel: HTMLSpanElement | null = null;
      (lines.length ? lines : [""]).forEach((line, i) => {
        if (i > 0) frag.appendChild(document.createElement("br"));
        const { checkbox, label } = makeChecklistItem(line);
        frag.appendChild(checkbox);
        frag.appendChild(label);
        lastLabel = label;
      });
      range2.insertNode(frag);
      if (lastLabel) {
        const caret = document.createRange();
        caret.selectNodeContents(lastLabel);
        caret.collapse(false);
        sel2?.removeAllRanges();
        sel2?.addRange(caret);
      }
    } else {
      const listEl = document.createElement(format === "bullet" ? "ul" : "ol");
      (lines.length ? lines : [""]).forEach((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        listEl.appendChild(li);
      });
      range2.insertNode(listEl);
      const caret = document.createRange();
      caret.selectNodeContents(listEl.lastElementChild ?? listEl);
      caret.collapse(false);
      sel2?.removeAllRanges();
      sel2?.addRange(caret);
    }
    readAndSave();
  };

  const handleInput = () => readAndSave();

  // Pressing Enter inside a checklist item is handled by hand, the same way a native
  // bullet/numbered list auto-continues onto the next <li> — plain contentEditable has
  // no idea a checkbox belongs on the next line, so without this, Enter would just
  // start an ordinary line with nothing on it.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    // Backspace at the start of a checklist item (or Delete / Backspace on an empty one)
    // removes its checkbox: an empty item disappears and its line joins the previous one,
    // an item with text keeps the text as a plain line. A checkbox is a non-editable
    // element, so the browser's own Backspace never takes it out.
    if ((e.key === "Backspace" || e.key === "Delete") && range.collapsed) {
      const anchor = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
      const item = anchor?.closest(".note-check-label") as HTMLElement | null;
      if (item) {
        const isEmpty = !item.textContent;
        const before = document.createRange();
        before.selectNodeContents(item);
        before.setEnd(range.startContainer, range.startOffset);
        const atStart = before.toString().length === 0;
        if ((e.key === "Backspace" && atStart) || (e.key === "Delete" && isEmpty)) {
          e.preventDefault();
          const checkbox = item.previousElementSibling;
          const parent = item.parentNode!;
          const caret = document.createRange();
          if (isEmpty) {
            const marker = document.createTextNode("");
            checkbox?.before(marker);
            const prev = (checkbox ?? item).previousSibling;
            const next = item.nextSibling;
            checkbox?.remove();
            item.remove();
            if (prev instanceof HTMLBRElement) prev.remove();
            else if (next instanceof HTMLBRElement) next.remove();
            const idx = Array.prototype.indexOf.call(parent.childNodes, marker);
            marker.remove();
            caret.setStart(parent, Math.max(0, idx));
          } else {
            const first = item.firstChild!;
            checkbox?.remove();
            item.replaceWith(...Array.from(item.childNodes));
            caret.setStart(first, 0);
          }
          caret.collapse(true);
          sel.removeAllRanges();
          sel.addRange(caret);
          readAndSave();
          return;
        }
      }
    }

    if (e.key !== "Enter" || e.shiftKey) return;
    const label = (range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement)
      ?.closest(".note-check-label");
    if (!label) return; // not inside a checklist item — let the browser handle Enter normally
    e.preventDefault();

    // An empty item means "done with the list" — remove it and drop back to a plain
    // line, rather than piling up another empty checkbox (matches how pressing Enter
    // on an empty native list item exits the list instead of continuing it).
    if (!label.textContent?.trim()) {
      const checkbox = label.previousElementSibling;
      const br = document.createElement("br");
      label.replaceWith(br);
      checkbox?.remove();
      const caret = document.createRange();
      caret.setStartAfter(br);
      caret.collapse(true);
      sel.removeAllRanges();
      sel.addRange(caret);
      readAndSave();
      return;
    }

    // Move everything after the caret out of the current label and into a fresh
    // checkbox + label pair on the next line.
    const afterRange = document.createRange();
    afterRange.setStart(range.startContainer, range.startOffset);
    afterRange.setEndAfter(label);
    const afterFragment = afterRange.extractContents();
    const carryOverLabel = afterFragment.querySelector(".note-check-label");
    const carryOverContents = carryOverLabel ? Array.from(carryOverLabel.childNodes) : [];

    const newCheckbox = document.createElement("input");
    newCheckbox.type = "checkbox";
    newCheckbox.className = "note-check";
    newCheckbox.setAttribute("contenteditable", "false");
    const newLabel = document.createElement("span");
    newLabel.className = "note-check-label";
    carryOverContents.forEach((n) => newLabel.appendChild(n));

    label.after(document.createElement("br"), newCheckbox, newLabel);

    const caret = document.createRange();
    caret.setStart(newLabel, 0);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
    readAndSave();
  };

  // Caught via a bubbled click rather than a React onChange on the container — a
  // checkbox's `checked` property is already flipped by the time a bubble-phase
  // listener sees the click, and click is a plain, unambiguous bubbling event (unlike
  // relying on React's form-control change normalization reaching a non-form
  // ancestor). Toggling only flips the DOM *property*; the HTML *attribute* (what
  // innerHTML actually serializes) has to be synced by hand or the checked state
  // would silently vanish on save/reload.
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      target.toggleAttribute("checked", target.checked);
      if (target.nextElementSibling instanceof HTMLElement) {
        target.nextElementSibling.classList.toggle("is-checked", target.checked);
      }
      readAndSave();
    }
  };

  // Pasting is forced to plain text rather than sanitizing arbitrary pasted markup —
  // simpler, and it means the only HTML that can ever end up in a note's content is
  // whatever the toolbar buttons below produce (bold/strike/lists/checkboxes), nothing
  // pasted in from elsewhere.
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 md:px-8 pt-6">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); scheduleSave(e.target.value, contentRef.current); }}
          onBlur={() => save(title, contentRef.current)}
          placeholder={stripHtml(content).split("\n").find((l) => l.trim()) || "Title"}
          className="w-full font-serif text-2xl md:text-3xl bg-transparent focus:outline-none placeholder:text-ink/30"
        />
      </div>
      <div className="mt-4 px-6 md:px-8 flex items-center gap-0.5 border-b border-line/60 pb-3">
        <ToolbarButton icon={Bold} label="Bold" onClick={() => exec("bold")} />
        <ToolbarButton
          icon={Strikethrough}
          label={crossOutTicked ? "Strikethrough (ticked items are crossed out, click with no text selected to turn off)" : "Strikethrough (click with no text selected to cross out ticked items)"}
          active={crossOutTicked}
          onClick={() => {
            const sel = window.getSelection();
            const inEditor = !!sel && !sel.isCollapsed && !!editorRef.current && editorRef.current.contains(sel.anchorNode);
            if (inEditor) exec("strikeThrough");
            else setCrossOutTicked((v) => !v);
          }}
        />
        <div className="w-px h-5 bg-line mx-1.5" />
        <ToolbarButton icon={List} label="Bullet list" onClick={() => applyLineFormat("bullet")} />
        <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => applyLineFormat("number")} />
        <ToolbarButton icon={SquareCheckBig} label="Checklist" onClick={() => applyLineFormat("checklist")} />
        <div className="w-px h-5 bg-line mx-1.5" />
        <ToolbarButton icon={ListIndentDecrease} label="Outdent" onClick={() => exec("outdent")} />
        <ToolbarButton icon={ListIndentIncrease} label="Indent" onClick={() => exec("indent")} />
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onPaste={handlePaste}
        onBlur={() => save(title, latestRef.current.content)}
        data-placeholder="Start writing…"
        className={cn("note-content flex-1 w-full mt-3 px-6 md:px-8 pb-6 focus:outline-none text-sm leading-relaxed text-ink", !crossOutTicked && "note-keep-ticked")}
      />
      <div className="px-6 md:px-8 py-3 border-t border-line/60 text-sm text-muted-foreground inline-flex items-center gap-1.5">
        {saving ? (
          <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
        ) : savedAt ? (
          <><Check className="h-3 w-3 text-clay" /> Saved {savedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</>
        ) : (
          "Autosaves as you type"
        )}
      </div>
    </div>
  );
}
