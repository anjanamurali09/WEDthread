import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileSpreadsheet, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { callIntegrationFn, useIntegrations, LINK_KINDS, type LinkKind } from "@/lib/integrations";

function ago(iso: string | null) {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs} hr ago` : new Date(iso).toLocaleDateString();
}

// Workspace → Integrations. A couple connects their Google account once; WEDthread creates a
// Google Sheet for the guest list / budget and keeps it in two-way sync, so they can work in
// Sheets while everything still flows through WEDthread.
export function IntegrationsSection({ weddingId }: { weddingId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useIntegrations(weddingId);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  const refresh = () => ["integrations", "guests", "expenses"].forEach((k) => qc.invalidateQueries({ queryKey: [k, weddingId] }));

  // Google sends the browser back here with ?integration=connected|denied|error.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const flag = p.get("integration");
    if (!flag) return;
    setMessage(flag === "connected" ? { tone: "ok", text: "Google connected. Create a sheet below to start syncing." }
      : flag === "denied" ? { tone: "error", text: "Google access wasn't granted, so nothing was connected." }
      : { tone: "error", text: "Couldn't finish connecting Google. Please try again." });
    refresh();
    p.delete("integration");
    const qs = p.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, []); // eslint-disable-line

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setMessage(null);
    try { await fn(); } catch (e) { setMessage({ tone: "error", text: e instanceof Error ? e.message : "Something went wrong." }); }
    setBusy(null);
  };

  const connect = () => run("connect", async () => {
    const { url } = await callIntegrationFn("google-oauth", { action: "start", wedding_id: weddingId, return_to: `${window.location.origin}${window.location.pathname}` });
    window.location.href = url;
  });
  const create = (kind: LinkKind) => run(`create-${kind}`, async () => {
    await callIntegrationFn("google-sheets-sync", { action: "create", wedding_id: weddingId, kind });
    refresh();
    setMessage({ tone: "ok", text: "Sheet created and filled from WEDthread." });
  });
  const syncNow = (kind: LinkKind) => run(`sync-${kind}`, async () => {
    const res = await callIntegrationFn("google-sheets-sync", { action: "sync", wedding_id: weddingId, kind });
    const r = res.results?.[kind];
    refresh();
    if (r?.error) throw new Error(r.error);
    const changed = (r?.fromSheet ?? 0) + (r?.created ?? 0);
    setMessage({ tone: "ok", text: changed ? `Synced — ${changed} change${changed === 1 ? "" : "s"} from the sheet saved to WEDthread.` : "Synced — everything is up to date." });
  });
  const setAuto = async (id: string, on: boolean) => {
    await supabase.from("integration_links").update({ auto_sync: on }).eq("id", id);
    refresh();
  };
  const unlink = (id: string) => run("unlink", async () => {
    await callIntegrationFn("google-sheets-sync", { action: "unlink", link_id: id });
    refresh();
  });
  const disconnect = () => run("disconnect", async () => {
    await callIntegrationFn("google-sheets-sync", { action: "disconnect", wedding_id: weddingId });
    refresh();
  });

  const conn = data?.connection;
  const linkFor = (kind: LinkKind) => data?.links.find((l) => l.kind === kind);

  return (
    <section className="max-w-xl paper-card p-8 mt-6">
      <h3 className="font-serif text-xl">Integrations</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Keep your guest list and budget in a Google Sheet that stays in sync with WEDthread. Edit in either place — changes flow both ways, and everything is saved in WEDthread.
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFF2B2] text-ink"><FileSpreadsheet className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Google Sheets</p>
            <p className="text-xs text-muted-foreground truncate">{conn ? `Connected${conn.account_email ? ` as ${conn.account_email}` : ""}` : "Not connected"}</p>
          </div>
        </div>
        {conn ? (
          <button onClick={() => setConfirmDisconnect(true)} disabled={!!busy}
            className="rounded-full border border-line px-4 py-1.5 text-sm hover:bg-stone cursor-pointer disabled:opacity-60 shrink-0">Disconnect</button>
        ) : (
          <button onClick={connect} disabled={!!busy || isLoading}
            className="rounded-full bg-ink text-paper px-4 py-1.5 text-sm hover:bg-clay cursor-pointer disabled:opacity-60 shrink-0">
            {busy === "connect" ? "Opening Google…" : "Connect Google"}
          </button>
        )}
      </div>

      {conn && (
        <div className="mt-3 space-y-3">
          {LINK_KINDS.map(({ kind, label, blurb }) => {
            const link = linkFor(kind);
            return (
              <div key={kind} className="rounded-2xl border border-line px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{blurb}</p>
                  </div>
                  {link ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={link.spreadsheet_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-stone">
                        Open sheet <ExternalLink className="h-3 w-3" />
                      </a>
                      <button onClick={() => syncNow(kind)} disabled={!!busy}
                        className="inline-flex items-center gap-1 rounded-full bg-ink text-paper px-3 py-1.5 text-xs hover:bg-clay cursor-pointer disabled:opacity-60">
                        <RefreshCw className={cn("h-3 w-3", busy === `sync-${kind}` && "animate-spin")} />
                        {busy === `sync-${kind}` ? "Syncing…" : "Sync now"}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => create(kind)} disabled={!!busy}
                      className="rounded-full bg-ink text-paper px-3 py-1.5 text-xs hover:bg-clay cursor-pointer disabled:opacity-60 shrink-0">
                      {busy === `create-${kind}` ? "Creating…" : "Create Google Sheet"}
                    </button>
                  )}
                </div>
                {link && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={link.auto_sync} onChange={(e) => setAuto(link.id, e.target.checked)} />
                      Keep in sync automatically
                    </label>
                    <span>
                      Last synced {ago(link.last_synced_at)} ·{" "}
                      <button onClick={() => setUnlinkId(link.id)} className="underline hover:text-ink cursor-pointer">Stop syncing</button>
                    </span>
                  </div>
                )}
                {link?.last_error && <p className="mt-2 text-xs text-destructive">{link.last_error}</p>}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground leading-relaxed">
            New rows you add to a sheet become guests / expenses in WEDthread. If the same row is changed in both places, WEDthread's version wins.
            To remove someone, delete them in WEDthread — a row deleted in the sheet comes back on the next sync. Don't reorder the columns or edit the ID column.
          </p>
        </div>
      )}

      {message && <p className={cn("mt-4 text-sm", message.tone === "ok" ? "text-sage-deep" : "text-destructive")}>{message.text}</p>}

      {confirmDisconnect && (
        <ConfirmDialog
          title="Disconnect Google?"
          description="Syncing stops and WEDthread loses access to Google. Your sheets stay in your Drive and your WEDthread data isn't touched."
          confirmLabel="Disconnect"
          onConfirm={() => { setConfirmDisconnect(false); disconnect(); }}
          onCancel={() => setConfirmDisconnect(false)}
        />
      )}
      {unlinkId && (
        <ConfirmDialog
          title="Stop syncing this sheet?"
          description="The sheet stays in your Google Drive but will no longer update. You can create a new one any time."
          confirmLabel="Stop syncing"
          onConfirm={() => { const id = unlinkId; setUnlinkId(null); unlink(id); }}
          onCancel={() => setUnlinkId(null)}
        />
      )}
    </section>
  );
}
