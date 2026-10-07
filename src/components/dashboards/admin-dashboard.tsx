import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/utils";
import { Store, MapPin, Clock, CheckCircle2 } from "lucide-react";

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-business-counts"],
    queryFn: async () => {
      const { data: rows } = await supabase.from("businesses").select("business_type,verification_status");
      const counts = { pendingVendors: 0, approvedVendors: 0, pendingVenues: 0, approvedVenues: 0 };
      for (const b of rows ?? []) {
        if (b.business_type === "vendor") {
          if (b.verification_status === "pending") counts.pendingVendors++;
          else if (b.verification_status === "verified") counts.approvedVendors++;
        } else if (b.business_type === "venue") {
          if (b.verification_status === "pending") counts.pendingVenues++;
          else if (b.verification_status === "verified") counts.approvedVenues++;
        }
      }
      return counts;
    },
  });

  const c = data ?? { pendingVendors: 0, approvedVendors: 0, pendingVenues: 0, approvedVenues: 0 };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Store} label="Vendors to review" value={c.pendingVendors} loading={isLoading} to="/admin/vendors" search={{ tab: "pending" }} accent="cherry" />
      <StatCard icon={CheckCircle2} label="Approved vendors" value={c.approvedVendors} loading={isLoading} to="/admin/vendors" search={{ tab: "approved" }} accent="sage" />
      <StatCard icon={MapPin} label="Venues to review" value={c.pendingVenues} loading={isLoading} to="/admin/venues" search={{ tab: "pending" }} accent="cherry" />
      <StatCard icon={CheckCircle2} label="Approved venues" value={c.approvedVenues} loading={isLoading} to="/admin/venues" search={{ tab: "approved" }} accent="sage" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, loading, to, search, accent }: {
  icon: any; label: string; value: number; loading: boolean; to?: string; search?: Record<string, string>; accent: "cherry" | "sage";
}) {
  const body = (
    <div className="paper-card p-5 h-full">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${accent === "cherry" ? "bg-blush-soft text-cherry" : "bg-sage-soft text-sage-deep"}`}>
        {loading ? <Clock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </span>
      <p className="font-serif text-4xl mt-3">{loading ? "–" : formatNumber(value)}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
  if (!to) return body;
  return <Link to={to as any} search={search as any} className="block hover:-translate-y-0.5 transition-transform">{body}</Link>;
}
