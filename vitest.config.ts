import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest deler ikke tsconfig'ens paths, så `@/…`-importer skal kortlægges her.
 * Uden det kan kun moduler med rene relative importer testes — og det er en
 * dårlig grund til at lade netop de moduler være utestede.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
