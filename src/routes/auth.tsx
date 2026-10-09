import { createFileRoute, Outlet } from "@tanstack/react-router";
import { noindexMeta } from "@/lib/seo";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: noindexMeta }),
  component: () => <Outlet />,
});
