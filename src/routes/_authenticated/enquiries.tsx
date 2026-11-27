import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Store, Inbox, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConversationThreadDialog } from "@/components/conversation-thread-dialog";
import { useCurrentWedding } from "@/lib/wedding-hooks";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/enquiries")({
  component: EnquiriesPage,
});

type Row = {
  id: string;
  businessId: string;
  businessName: string;
  kind: "venue" | "vendor";
  // What the couple asked about, when it was a specific service (a photographer's wedding package, say).
  about: string | null;
  preview: string;
  updatedAt: string;
  replied: boolean;
};

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// Every venue and vendor the couple has contacted, with where each enquiry stands. One row per business: sending a
// second enquiry to the same business continues the same conversation (see submit-enquiry).
function EnquiriesPage() {
  const { data: wedding } = useCurrentWedding();
  const weddingId = wedding?.id;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["couple-conversations", weddingId, "page"],
    enabled: !!weddingId,
    queryFn: async (): Promise<Row[]> => {
      const { data: convos } = await supabase.from("conversations").select("id,business_id,updated_at")
        .eq("wedding_id", weddingId!).order("updated_at", { ascending: false });
      if (!convos || convos.length === 0) return [];
      const ids = convos.map((c) => c.id);
      const [{ data: businesses }, { data: msgs }, { data: enquiries }] = await Promise.all([
        supabase.from("businesses").select("id,legal_business_name,business_type").in("id", convos.map((c) => c.business_id)),
        supabase.from("conversation_messages").select("conversation_id,sender_role,body,created_at").in("conversation_id", ids).order("created_at", { ascending: false }),
        supabase.from("enquiries").select("conversation_id,vendor_service_id,created_at").in("conversation_id", ids).order("created_at", { ascending: false }),
      ]);
      const serviceIds = Array.from(new Set((enquiries ?? []).map((e) => e.vendor_service_id).filter(Boolean))) as string[];
      const { data: services } = serviceIds.length
        ? await supabase.from("vendor_services").select("id,service_name").in("id", serviceIds)
        : { data: [] as { id: string; service_name: string }[] };

      const biz = new Map((businesses ?? []).map((b) => [b.id, b]));
      const serviceName = new Map((services ?? []).map((s) => [s.id, s.service_name]));
      const preview = new Map<string, string>();
      const replied = new Set<string>();
      for (const m of msgs ?? []) {
        if (!preview.has(m.conversation_id)) preview.set(m.conversation_id, m.body);
        if (m.sender_role === "vendor") replied.add(m.conversation_id);
      }
      const about = new Map<string, string>();
      for (const e of enquiries ?? []) if (e.vendor_service_id && !about.has(e.conversation_id)) about.set(e.conversation_id, serviceName.get(e.vendor_service_id) ?? "");

      return convos.map((c) => {
        const b = biz.get(c.business_id);
        return {
          id: c.id, businessId: c.business_id,
          businessName: b?.legal_business_name ?? "Venue or vendor",
          kind: b?.business_type === "venue" ? "venue" : "vendor",
          about: about.get(c.id) || null,
          preview: (preview.get(c.id) ?? "").replace(/^New enquiry:[^\n]*\n+/, ""),
          updatedAt: c.updated_at,
          replied: replied.has(c.id),
        } satisfies Row;
      });
    },
  });
  const [open, setOpen] = useState<Row | null>(null);

  const waiting = rows.filter((r) => !r.replied).length;

  return (
    <AppShell
      title="Enquiries"
      subtitle="Every venue and vendor you've contacted, and where each enquiry stands."
    >
      {isLoading || !wedding ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="grid min-h-[60vh] place-items-center">
        <div className="w-full max-w-xl rounded-3xl border border-line bg-white px-8 py-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-[#7FA8D6]" strokeWidth={1.5} />
          <h3 className="mt-3 font-serif text-2xl">No enquiries yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            When you ask a venue or vendor for details, it shows up here, along with their reply.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/business/browse-venues" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-sm text-paper hover:bg-clay">
              <Search className="h-4 w-4" /> Browse venues
            </Link>
            <Link to="/business/browse-vendors" className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-2.5 text-sm hover:bg-stone">
              <Search className="h-4 w-4" /> Browse vendors
            </Link>
          </div>
        </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "enquiry" : "enquiries"} sent
            {waiting > 0 ? ` · ${waiting} waiting for a reply` : " · all replied to"}
          </p>
          <div className="grid gap-2.5">
            {rows.map((r) => {
              const Icon = r.kind === "venue" ? MapPin : Store;
              return (
                <button key={r.id} type="button" onClick={() => setOpen(r)}
                  className="flex cursor-pointer items-start gap-4 rounded-2xl border border-line bg-white px-5 py-4 text-left transition-colors hover:border-[#243746]/40">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-[#243746]">
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{r.businessName}</span>
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">{r.kind === "venue" ? "Venue" : "Vendor"}</span>
                    </span>
                    {r.about && <span className="block text-sm text-muted-foreground">About: {r.about}</span>}
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{r.preview}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-medium",
                      r.replied ? "bg-[#243746] text-[#FFF7D6]" : "bg-[#FFF2B2] text-[#243746]")}>
                      {r.replied ? "Replied" : "Sent"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDay(r.updatedAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {open && (
        <ConversationThreadDialog
          conversationId={open.id}
          title={open.businessName}
          senderRole="couple"
          open={!!open}
          onOpenChange={(o) => !o && setOpen(null)}
          reviewBusiness={{ id: open.businessId, name: open.businessName }}
        />
      )}
    </AppShell>
  );
}
