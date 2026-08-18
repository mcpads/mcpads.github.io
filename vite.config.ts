import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

function pageEntry(path: string): string {
  return fileURLToPath(new URL(path, import.meta.url));
}

export default defineConfig({
  base: "/",
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: pageEntry("index.html"),
        workEvolution: pageEntry("notes/work-evolution/index.html"),
      },
    },
  },
});
