import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

type Review = { id: string; rating: number; review_text: string | null; created_at: string; reviewerName: string };

// Average is calculated on read (a plain client-side average over the
// fetched rows), not stored as a denormalized column on `businesses` — a
// business's review count is small enough that this is cheap, and it can
// never drift out of sync the way a trigger-maintained counter can if a row
// is ever edited outside the app.
function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function StarRow({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= rating ? "fill-cherry text-cherry" : "text-line"}`} />
      ))}
    </div>
  );
}

export function ReviewsSection({ businessId, refreshKey }: { businessId: string; refreshKey?: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from("reviews").select("id,rating,review_text,created_at,wedding_id")
        .eq("business_id", businessId).order("created_at", { ascending: false });
      const list = rows ?? [];
      if (list.length === 0) { setReviews([]); setLoading(false); return; }
      const { data: weddings } = await supabase.from("weddings").select("id,partner_a").in("id", list.map((r) => r.wedding_id));
      const nameById = new Map((weddings ?? []).map((w) => [w.id, w.partner_a?.split(" ")[0] ?? "A couple"]));
      setReviews(list.map((r) => ({ ...r, reviewerName: nameById.get(r.wedding_id) ?? "A couple" })));
      setLoading(false);
    })();
  }, [businessId, refreshKey]);

  if (loading) return null;
  if (reviews.length === 0) return <p className="text-sm text-muted-foreground">No reviews yet.</p>;

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div>
      <div className="flex items-center gap-3">
        <StarRow rating={Math.round(average)} size="h-5 w-5" />
        <p className="text-sm">
          <span className="font-medium">{average.toFixed(1)}</span>
          <span className="text-muted-foreground"> · {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
        </p>
      </div>
      <div className="mt-5 grid gap-4">
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-line/60 pb-4 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{r.reviewerName}</p>
              <p className="text-sm text-muted-foreground">{relativeDate(r.created_at)}</p>
            </div>
            <div className="mt-1"><StarRow rating={r.rating} /></div>
            {r.review_text && <p className="mt-2 text-sm text-muted-foreground">{r.review_text}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
