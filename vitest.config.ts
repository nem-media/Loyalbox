import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest deler ikke tsconfig'ens paths, så `@/…`-importer skal kortlægges her.
 * Uden det kan kun moduler med rene relative importer testes — og det er en
 * dårlig grund til at lade netop de moduler være utestede.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      /*
       * `server-only` løses internt af Next og ligger ikke i node_modules.
       * Uden en stand-in kan de fem filer, der bærer den, slet ikke testes —
       * samme argument som `@`-aliaset ovenfor, og de er ikke tilfældige
       * filer: det er dem, der rører Stripe, lageret og trykfilen.
       */
      "server-only": fileURLToPath(
        new URL("./test-stubs/server-only.ts", import.meta.url),
      ),
    },
  },
});
