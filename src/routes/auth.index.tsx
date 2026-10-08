import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { Logo } from "@/components/logo";
import { ROLE_LANDING, type AppRole } from "@/hooks/use-active-role";
import { resolveCoupleLanding } from "@/lib/wedding-hooks";
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
// Speed matters here: the panel is blue until a photo is ready. So the last set of photos that passed
// the size check is remembered in the browser and shown at once on the next visit, and on a first visit
// each photo is shown the moment it passes (not after every candidate has finished downloading).
const HERO_CACHE_KEY = "wedthread.auth-hero-photos";

function useAuthHeroPhotos() {
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    let usedCache = false;
    // 1. Straight away: whatever worked last time (already in the browser's image cache).
    try {
      const cached = JSON.parse(localStorage.getItem(HERO_CACHE_KEY) || "[]");
      if (Array.isArray(cached) && cached.length) { usedCache = true; setPhotos(cached.filter((u): u is string => typeof u === "string").slice(0, 6)); }
    } catch { /* storage unavailable: just load fresh */ }

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
      // 2. Check every candidate in parallel. Only genuinely high-resolution photos are used (the panel is huge
      //    on a retina screen); anything smaller is skipped rather than stretched. Each photo that passes is
      //    shown immediately; the verified set replaces the remembered one at the end.
      const passed: string[] = [];
      let settled = 0;
      const finish = () => {
        if (cancelled) return;
        const finalSet = passed.slice(0, 6);
        if (finalSet.length) {
          setPhotos(finalSet);
          try { localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(finalSet)); } catch { /* ignore */ }
        }
      };
      urls.forEach((url) => {
        const img = new Image();
        let done = false;
        const settle = (ok: boolean) => {
          if (done) return;
          done = true;
          if (ok && passed.length < 6) {
            passed.push(url);
            // First visit: add each photo as soon as it passes, so the first appears at once and the rotation can start.
            if (!cancelled && !usedCache) setPhotos((prev) => (prev.includes(url) ? prev : [...prev, url].slice(0, 6)));
          }
          settled++;
          if (settled === urls.length) finish();
        };
        const timer = setTimeout(() => settle(false), 8000);
        img.onload = () => { clearTimeout(timer); settle(img.naturalWidth >= 1800 && img.naturalHeight >= 1100); };
        img.onerror = () => { clearTimeout(timer); settle(false); };
        img.src = url;
      });
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
            Couples, planners, venues, vendors, and sellers all live under one login. You'll choose how you'll use WedThread when you sign up.
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
  validateSearch: (s: Record<string, unknown>): { mode?: "signup" | "forgot"; verified?: boolean } => ({
    ...(s.mode === "signup" ? { mode: "signup" as const } : s.mode === "forgot" ? { mode: "forgot" as const } : {}),
    ...(s.verified === 1 || s.verified === "1" || s.verified === true ? { verified: true } : {}),
  }),
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
    navigate({ to: (await resolveCoupleLanding(u.user.id)) as any, replace: true });
    return;
  }
  navigate({ to: ROLE_LANDING[active] as any, replace: true });
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setResendNote(error ? error.message : "Sent again. It can take a minute to arrive.");
  };

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!role) throw new Error("Choose how you'll use WedThread first.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: {
            // The role chosen above is saved with the account as it is created.
            data: { signup_role: role },
            // The link in the email brings the person back to the sign-in page.
            emailRedirectTo: `${window.location.origin}/auth?verified=1`,
          },
        });
        if (error) throw error;
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

      <div className="flex flex-col justify-center p-8 md:p-16">
        <div className="max-w-md w-full mx-auto">
          <h1 className="font-serif text-4xl">
            {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Choose how you'll use WedThread, then sign up with your email."
              : mode === "forgot"
                ? "Enter your email and we'll send you a link to choose a new one."
                : "Sign in to continue where you left off."}
          </p>

          {mode === "forgot" ? (
            <div className="mt-8"><ForgotPasswordForm initialEmail={email} onBack={() => setMode("signin")} /></div>
          ) : (<>
          {search.verified && mode === "signin" && (
            <p className="mt-6 rounded-2xl bg-[#FFF7D6] px-4 py-3 text-sm text-[#243746]">Your email is verified. Sign in to continue.</p>
          )}

          <form onSubmit={onEmail} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-sm uppercase tracking-widest text-muted-foreground">I'm signing up as</label>
                <div className="mt-2 space-y-2" role="radiogroup" aria-label="Account type">
                  {ROLE_OPTIONS.map(({ role: r, label, desc, icon: Icon }) => (
                    <button key={r} type="button" role="radio" aria-checked={role === r} disabled={!!sentTo} onClick={() => setRole(r)} data-static
                      className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                        role === r ? "border-[#243746] bg-[#FFF7D6]" : "border-line bg-pearl hover:border-cherry")}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-wine-soft text-wine"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="block text-xs text-muted-foreground">{desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm uppercase tracking-widest text-muted-foreground">Email</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={!!sentTo}
                className="mt-1 w-full rounded-2xl border border-line bg-pearl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            </div>
            <div>
              <label className="text-sm uppercase tracking-widest text-muted-foreground">Password</label>
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-line bg-pearl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            </div>
            {mode === "signin" && (
              <div className="text-right -mt-1">
                <button type="button" onClick={() => setMode("forgot")} className="text-sm text-cherry underline underline-offset-4">Forgot password?</button>
              </div>
            )}
            <button disabled={loading || !!sentTo || (mode === "signup" && !role)} className="w-full rounded-full bg-cherry text-pearl py-3 text-sm font-medium hover:bg-wine disabled:opacity-60 transition-colors">
              {loading ? "Please wait…" : sentTo ? "Verify your email" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
            {mode === "signup" && sentTo && (
              <div className="rounded-2xl bg-[#FFF7D6] px-4 py-3 text-sm text-[#243746]">
                <p>Please check your email. We sent a verification link to <span className="font-medium">{sentTo}</span>. Click it to finish creating your account.</p>
                <p className="mt-2 text-muted-foreground">Can't find it? Check your spam folder, or{" "}
                  <button type="button" onClick={resendVerification} className="text-cherry underline underline-offset-4">send it again</button>
                  {" "}or{" "}
                  <button type="button" onClick={() => { setSentTo(null); setResendNote(null); }} className="text-cherry underline underline-offset-4">use a different email</button>.
                </p>
                {resendNote && <p className="mt-2">{resendNote}</p>}
              </div>
            )}
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
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
