// @lovable.dev/vite-tanstack-config provides the base TanStack Start/Vite setup.
// Nitro is added for Vercel's supported TanStack Start deployment path.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  vite: {
    plugins: [nitro()],
  },
});
