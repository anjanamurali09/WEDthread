import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { ROLE_LANDING, type AppRole } from "@/hooks/use-active-role";
import { cn } from "@/lib/utils";

// A rotating headline per photo — generic enough to pair with any listing
// image that comes back from the query below.
const HERO_SLIDES = [
  "One account. Every side of your wedding.",
  "Venues, vendors, and the couples who book them.",
  "From the first enquiry to the last dance.",
  "Every side of the wedding, planned in one place.",
];

// Real photos already uploaded for approved venues/vendors, cycling behind
// the headline — no stock imagery, just what's actually on the platform.
function useAuthHeroPhotos() {
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("business_media")
        .select("url, businesses!inner(verification_status)")
        .eq("media_type", "photo")
        .eq("businesses.verification_status", "verified")
        .order("created_at", { ascending: false })
        .limit(40);
      if (cancelled || !data) return;
      const urls = data.map((r) => r.url);
      for (let i = urls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [urls[i], urls[j]] = [urls[j], urls[i]];
      }
      // Only genuinely high-resolution photos are shown here (the panel is huge on a retina screen) —
      // anything smaller is skipped rather than stretched. Sizes are only known once an image loads.
      const sharp = await Promise.all(urls.map((url) => new Promise<string | null>((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => resolve(null), 8000);
        img.onload = () => { clearTimeout(timer); resolve(img.naturalWidth >= 1800 && img.naturalHeight >= 1100 ? url : null); };
        img.onerror = () => { clearTimeout(timer); resolve(null); };
        img.src = url;
      })));
      if (cancelled) return;
      setPhotos(sharp.filter((u): u is string => !!u).slice(0, 6));
    })();
    return () => { cancelled = true; };
  }, []);
  return photos;
}

function AuthHeroPanel() {
  const photos = useAuthHeroPhotos();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % photos.length), 6000);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <div className="hidden lg:block relative overflow-hidden bg-ink text-pearl">
      {photos.map((url, i) => (
        <img key={url} src={url} alt=""
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out",
            i === index ? "opacity-100" : "opacity-0")} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/40" />
      <div className="relative flex h-full flex-col justify-between p-12">
        <Link to="/" data-static className="flex items-center gap-2">
          <Logo className="text-pearl" />
        </Link>
        <div className="max-w-xl rounded-3xl bg-white/95 p-8 shadow-lg text-ink">
          <h2 className="font-serif text-4xl leading-tight text-balance text-[#243746]">
            {HERO_SLIDES[index % HERO_SLIDES.length]}
          </h2>
          <p className="mt-4 text-sm text-[#4A7CAD] max-w-sm">
            Couples, planners, venues, vendors, and sellers all live under one login. You'll pick how you'll use WedThread after signing up.
          </p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Sign in or join WedThread" },
      { name: "description", content: "Sign in or create your WedThread account." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { mode?: "signup" } => (s.mode === "signup" ? { mode: "signup" } : {}),
  component: AuthPage,
});

async function routeAfterSignIn(navigate: ReturnType<typeof useNavigate>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id);
  // Sign-in never asks for a role. If none exists, silently default to couple.
  let active = (roles?.[0]?.role as AppRole | undefined) ?? null;
  if (!active) {
    await supabase.from("user_roles").insert({ user_id: u.user.id, role: "couple" });
    active = "couple";
  }
  window.localStorage.setItem("wedthread.activeRole", active);
  if (active === "couple") {
    const { data: w } = await supabase
      .from("weddings")
      .select("id")
      .eq("owner_id", u.user.id)
      .limit(1)
      .maybeSingle();
    navigate({ to: (w ? "/dashboard" : "/onboarding") as any, replace: true });
    return;
  }
  navigate({ to: ROLE_LANDING[active] as any, replace: true });
}

// After sign-up we always send the user to pick a role.
async function routeAfterSignUp(navigate: ReturnType<typeof useNavigate>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  navigate({ to: "/auth/role" as any, replace: true });
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);


  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created.");
        await routeAfterSignUp(navigate);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await routeAfterSignIn(navigate);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-pearl text-ink">
      <AuthHeroPanel />

      <div className="flex flex-col justify-center p-8 md:p-16">
        <div className="max-w-md w-full mx-auto">
          <h1 className="font-serif text-4xl">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Sign up with your email. You'll choose your role next."
              : "Sign in to continue where you left off."}
          </p>

          <form onSubmit={onEmail} className="mt-8 space-y-4">
            <div>
              <label className="text-sm uppercase tracking-widest text-muted-foreground">Email</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-line bg-pearl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            </div>
            <div>
              <label className="text-sm uppercase tracking-widest text-muted-foreground">Password</label>
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-line bg-pearl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            </div>
            <button disabled={loading} className="w-full rounded-full bg-cherry text-pearl py-3 text-sm font-medium hover:bg-wine disabled:opacity-60 transition-colors">
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-cherry underline underline-offset-4">
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
