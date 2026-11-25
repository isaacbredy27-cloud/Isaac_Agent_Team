import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const repo = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      "@schemas": `${repo}packages/schemas/src/index.ts`,
      "@scoring": `${repo}packages/scoring/src/index.ts`,
    },
  },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});
