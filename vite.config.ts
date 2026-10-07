import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Plain Vite setup: TanStack Start (SSR) + React + Tailwind, built for Cloudflare Workers.
// `@/…` imports resolve through tsconfig.json paths. VITE_* variables from .env (or the host's
// environment at build time) are exposed to the browser by Vite itself.
export default defineConfig(({ command }) => ({
  plugins: [
    tsConfigPaths(),
    // The server entry is src/server.ts (our SSR error wrapper).
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
    tailwindcss(),
    // Only needed to package the server for deployment, not while developing.
    command === "build" ? nitro({ preset: "cloudflare-module", cloudflare: { deployConfig: true, nodeCompat: true, wrangler: { name: "wedthread" } } }) : null,
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query", "@tanstack/react-start"],
  },
  server: { host: true, port: 8080 },
}));
