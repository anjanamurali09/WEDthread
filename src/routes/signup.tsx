import { createFileRoute, redirect } from "@tanstack/react-router";

// A short, readable address for "create an account" (wedthread.co/signup). It sends people on to the sign-up form.
export const Route = createFileRoute("/signup")({
  beforeLoad: () => { throw redirect({ to: "/auth", search: { mode: "signup" } as any, replace: true }); },
});
