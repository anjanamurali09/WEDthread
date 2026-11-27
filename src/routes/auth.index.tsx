import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { noindexMeta } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { Logo } from "@/components/logo";
import { ROLE_LANDING, type AppRole } from "@/hooks/use-active-role";
import { getSessionUser } from "@/lib/session-user";
import { ROLE_OPTIONS } from "@/lib/role-options";
import { cn } from "@/lib/utils";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

// A rotating headline per photo — generic enough to pair with any listing
// image that comes back from the query below.
const HERO_SLIDES = [
  "One account. Every side of your wedding.",
  "Venues, vendors, and the couples who book them.",
  "From the first enquiry to the last dance.",
  "Every side of the wedding, planned in one place.",
];

// Real photos already uploaded for approved venues/vendors, cycling behind
// the headline: no stock imagery, just what's actually on the platform.
//
// The panel is huge (and sharp screens double it), so only high-resolution photos are used; anything smaller
// is skipped rather than stretched into a blur. Speed matters too: the panel is blue until a photo is ready,
// so the last set that passed is remembered in the browser and shown at once on the next visit, and on a
// first visit each photo is shown the moment it passes. Candidates are checked a few at a time and checking
// stops as soon as there are enough, so visitors never download the whole library.
const HERO_CACHE_KEY = "wedthread.auth-hero-photos-v2";
const HERO_MIN_WIDTH = 1600;
const HERO_MIN_HEIGHT = 1000;
const HERO_WANTED = 6;
const HERO_BATCH = 6;

function isSharpEnough(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), 8000);
    img.onload = () => { clearTimeout(timer); resolve(img.naturalWidth >= HERO_MIN_WIDTH && img.naturalHeight >= HERO_MIN_HEIGHT); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}

function useAuthHeroPhotos() {
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    // The photo panel only exists on wide screens; on phones don't download anything for it.
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    let cancelled = false;
    let usedCache = false;
    // 1. Straight away: whatever worked last time (already in the browser's image cache).
    try {
      const cached = JSON.parse(localStorage.getItem(HERO_CACHE_KEY) || "[]");
      if (Array.isArray(cached) && cached.length) { usedCache = true; setPhotos(cached.filter((u): u is string => typeof u === "string").slice(0, HERO_WANTED)); }
    } catch { /* storage unavailable: just load fresh */ }

    (async () => {
      const { data } = await supabase
        .from("business_media")
        .select("url, businesses!inner(verification_status)")
        .eq("media_type", "photo")
        .eq("businesses.verification_status", "verified")
        .order("created_at", { ascending: false })
        .limit(120);
      if (cancelled || !data) return;
      const urls = data.map((r) => r.url);
      for (let i = urls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [urls[i], urls[j]] = [urls[j], urls[i]];
      }
      // 2. Check a batch at a time; stop once there are enough sharp ones.
      const passed: string[] = [];
      for (let start = 0; start < urls.length && passed.length < HERO_WANTED && !cancelled; start += HERO_BATCH) {
        await Promise.all(urls.slice(start, start + HERO_BATCH).map(async (url) => {
          if (!(await isSharpEnough(url)) || cancelled || passed.length >= HERO_WANTED) return;
          passed.push(url);
          // First visit: add each photo as soon as it passes, so the first appears at once and the rotation can start.
          if (!usedCache) setPhotos((prev) => (prev.includes(url) ? prev : [...prev, url].slice(0, HERO_WANTED)));
        }));
      }
      if (cancelled) return;
      if (passed.length) {
        setPhotos(passed);
        try { localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(passed)); } catch { /* ignore */ }
      }
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
    const t = setInterval(() => setIndex((i) => (i + 1) % photos.length), 15000);
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
        <div className="max-w-3xl rounded-3xl bg-white/95 px-8 py-6 shadow-lg text-ink">
          <h2 className="font-serif text-3xl leading-tight text-balance text-[#243746]">
            {HERO_SLIDES[index % HERO_SLIDES.length]}
          </h2>
          <p className="mt-3 text-sm text-[#4A7CAD]">
            Couples, planners, venues, vendors, and sellers all live under one login. You'll choose how you'll use WEDthread when you sign up.
          </p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Sign in or join WEDthread" },
      { name: "description", content: "Sign in or create your WEDthread account." },
      ...noindexMeta,
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { mode?: "signup" | "forgot"; verified?: boolean } => ({
    ...(s.mode === "signup" ? { mode: "signup" as const } : s.mode === "forgot" ? { mode: "forgot" as const } : {}),
    ...(s.verified === 1 || s.verified === "1" || s.verified === true ? { verified: true } : {}),
  }),
  component: AuthPage,
});

async function routeAfterSignIn(navigate: ReturnType<typeof useNavigate>) {
  const user = await getSessionUser();
  if (!user) return;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  // Sign-in never asks for a role. If none exists, silently default to couple.
  let active = (roles?.[0]?.role as AppRole | undefined) ?? null;
  if (!active) {
    await supabase.from("user_roles").insert({ user_id: user.id, role: "couple" });
    active = "couple";
  }
  window.localStorage.setItem("wedthread.activeRole", active);
  // Couples always land on the dashboard (it shows the setup popup if they have no wedding yet).
  navigate({ to: (active === "couple" ? "/dashboard" : ROLE_LANDING[active]) as any, replace: true });
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  // Set once the sign-up went through but the email still has to be verified.
  const [role, setRole] = useState<AppRole | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState<string | null>(null);


  // Arriving from the verification email: the link signs the browser in, but the person should land on
  // the sign-in page, so clear that session and say the email is verified.
  useEffect(() => {
    if (!search.verified) return;
    setMode("signin");
    (async () => {
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) break;
        await new Promise((r) => setTimeout(r, 150));
      }
      await supabase.auth.signOut({ scope: "local" });
    })();
  }, [search.verified]);

  const resendVerification = async () => {
    if (!sentTo) return;
    setResendNote(null);
    const { error } = await supabase.auth.resend({ type: "signup", email: sentTo, options: { emailRedirectTo: `${window.location.origin}/auth?verified=1` } });
    setResendNote(error ? error.message : "Sent again.");
  };

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!role) throw new Error("Choose how you'll use WEDthread first.");
        const first = firstName.trim(), last = lastName.trim();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: {
            // The role chosen above is saved with the account as it is created, with the name and phone.
            // `full_name` becomes the profile's display name (the sign-up trigger reads it).
            data: { signup_role: role, first_name: first, last_name: last, full_name: `${first} ${last}`, phone: phone.trim() || undefined },
            // The link in the email brings the person back to the sign-in page.
            emailRedirectTo: `${window.location.origin}/auth?verified=1`,
          },
        });
        if (error) throw error;
        // An address that already has an account does not come back as an error; Supabase returns a user with no
        // identities instead (so it cannot be used to probe for accounts). Say so rather than "check your email".
        if (data.user && (data.user.identities ?? []).length === 0) throw new Error("This email is already registered. Sign in instead, or use \"Forgot password\" if you can't remember it.");
        track("sign_up", { method: "email", account_type: role });
        if (!data.session) { setSentTo(email.trim()); setResendNote(null); return; }
        await routeAfterSignIn(navigate);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        track("login", { method: "email" });
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

      <div className="flex flex-col justify-center px-8 py-6 md:px-10 md:py-6">
        <div className={cn("w-full mx-auto", mode === "signup" ? "max-w-xl" : "max-w-md")}>
          <h1 className="font-serif text-3xl">
            {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
          </h1>
          {mode !== "signup" && <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot"
                ? "Enter your email and we'll send you a link to choose a new one."
                : "Sign in to continue where you left off."}
          </p>}

          {mode === "forgot" ? (
            <div className="mt-8"><ForgotPasswordForm initialEmail={email} onBack={() => setMode("signin")} /></div>
          ) : (<>
          {search.verified && mode === "signin" && (
            <p className="mt-6 rounded-2xl bg-[#FFF7D6] px-4 py-3 text-sm text-[#243746]">Your email is verified. Sign in to continue.</p>
          )}

          <form onSubmit={onEmail} className="mt-4 space-y-2.5">
            {mode === "signup" && (
              <div className="mb-8">
                <label className="text-xs uppercase tracking-widest text-muted-foreground">I'm signing up as</label>
                <div className="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-2" role="radiogroup" aria-label="Account type">
                  {/* Ways to sign up today on the left; the ones still to come on the right, with room for "Coming soon". */}
                  {[ROLE_OPTIONS.filter((o) => !o.comingSoon), ROLE_OPTIONS.filter((o) => o.comingSoon)].map((group, g) => (
                    <div key={g} className="space-y-2">
                      {group.map(({ role: r, label, icon: Icon, comingSoon }) => (
                    <button key={r} type="button" role="radio" aria-checked={role === r} disabled={!!sentTo || comingSoon} onClick={() => setRole(r)} data-static
                      className={cn("flex w-full items-center gap-2 rounded-2xl border px-2.5 py-2 text-left transition-colors",
                        comingSoon ? "border-line bg-pearl opacity-60 cursor-not-allowed" : role === r ? "border-[#243746] bg-[#FFF7D6]" : "border-line bg-pearl hover:border-cherry")}>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#FFE08A] text-[#243746]"><Icon className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1 text-[13px] font-medium leading-tight">{label}</span>
                      {comingSoon && <span className="shrink-0 rounded-full bg-[#FFE08A] px-1.5 py-px text-[10px] font-medium text-[#243746]">Coming soon</span>}
                    </button>
                  ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">First name</label>
                  <input required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} readOnly={!!sentTo}
                    className="mt-0.5 w-full rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Last name</label>
                  <input required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} readOnly={!!sentTo}
                    className="mt-0.5 w-full rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
                </div>
              </div>
            )}
            <div className={mode === "signup" ? "grid grid-cols-2 gap-3" : undefined}>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
                <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={!!sentTo}
                  className="mt-0.5 w-full rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
              </div>
              {mode === "signup" && (
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">Phone <span className="normal-case tracking-normal">(Optional)</span></label>
                  <input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} readOnly={!!sentTo}
                    className="mt-0.5 w-full rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
                </div>
              )}
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-0.5 w-full rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            </div>
            {mode === "signin" && (
              <div className="text-right -mt-1">
                <button type="button" onClick={() => setMode("forgot")} className="text-sm text-cherry underline underline-offset-4">Forgot password?</button>
              </div>
            )}
            <button disabled={loading || !!sentTo} className="w-full rounded-full bg-cherry text-pearl py-2.5 text-sm font-medium hover:bg-wine disabled:opacity-60 transition-colors">
              {loading ? "Please wait…" : sentTo ? "Verify your email" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
            {mode === "signup" && sentTo && (
              <div className="rounded-2xl bg-[#FFF7D6] px-4 py-3 text-sm text-[#243746]">
                <p>Check your email (and spam) for the verification link.</p>
                <p className="mt-1 text-muted-foreground">
                  <button type="button" onClick={resendVerification} className="text-cherry underline underline-offset-4">Send again</button>
                  {" · "}
                  <button type="button" onClick={() => { setSentTo(null); setResendNote(null); }} className="text-cherry underline underline-offset-4">Use a different email</button>
                </p>
                {resendNote && <p className="mt-1">{resendNote}</p>}
              </div>
            )}
          </form>

          <p className="mt-4 text-sm text-center text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-cherry underline underline-offset-4">
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
          </>)}
        </div>
      </div>
    </div>
  );
}
