import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vendors")({ component: VendorsPage });

function VendorsPage() {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const { data: cats = [] } = useQuery({
    queryKey: ["vendor-categories"],
    queryFn: async () => (await supabase.from("vendor_categories").select("*").order("name")).data ?? [],
  });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => (await supabase.from("vendors").select("*").eq("status", "approved").order("business_name")).data ?? [],
  });

  const filtered = vendors.filter((v: any) =>
    (!categoryId || v.category_id === categoryId) &&
    (!q || v.business_name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <AppShell title="Vendors" subtitle="Planners, photographers, mehendi artists, florists — filtered by the destination you actually chose.">
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors…" className="w-full rounded-full border border-line pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        </div>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-full border border-line px-4 py-2.5 text-sm bg-paper">
          <option value="">All categories</option>
          {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <h3 className="font-serif text-2xl">Marketplace opens in Phase 2</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">We're focused on getting your planning perfect first. Vendors will onboard through a separate approved workflow — you'll browse and enquire right here.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((v: any) => (
            <article key={v.id} className="paper-card overflow-hidden">
              <div className="aspect-[4/3] bg-stone" style={v.hero_image ? { backgroundImage: `url(${v.hero_image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
              <div className="p-5">
                <h3 className="font-serif text-xl">{v.business_name}</h3>
                {(v.home_city || v.home_country) && <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[v.home_city, v.home_country].filter(Boolean).join(", ")}</p>}
                {v.description && <p className="mt-3 text-sm text-ink/70 line-clamp-3">{v.description}</p>}
                {v.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{v.tags.slice(0, 4).map((t: string) => <span key={t} className="text-[10px] rounded-full bg-stone px-2 py-0.5">{t}</span>)}</div>}
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
