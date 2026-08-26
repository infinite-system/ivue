import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import { configDefaults, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    // ONE Vue runtime for everything. npm nests a second (newer-patch) Vue
    // under @vue/test-utils; components then render with the root runtime
    // while test-utils drives the nested one → "Cannot read properties of
    // null (reading 'ce')" in slot rendering. Dedupe + inlining test-utils
    // routes every import through the root copy.
    resolve: {
      dedupe: [
        "vue",
        "@vue/runtime-core",
        "@vue/runtime-dom",
        "@vue/reactivity",
        "@vue/shared",
        "@vue/compiler-dom",
        "@vue/server-renderer",
      ],
    },
    test: {
      environment: "jsdom",
      // POSITIVE include — the root suite names what it runs, not what it
      // avoids: newsletter/ has its own vitest config (run it FROM
      // newsletter/), and .claude/ holds the invariants checker's node:test
      // suite (`node --test`). Dot-directory exclude patterns behave
      // differently across vitest/glob builds (CI collected .claude/
      // despite ".claude/**" in exclude), so exclusion alone is not enough.
      include: [
        "lib/**/*.vitest.spec.ts",
        "skills/**/*.test.ts",
        "examples/**/*.vitest.spec.ts",
        "experiments/**/*.vitest.spec.ts",
      ],
      exclude: [...configDefaults.exclude, "e2e/*", "**/demo/**", "newsletter/**", ".claude/**"],
      root: fileURLToPath(new URL("./", import.meta.url)),
      reporters: ["default", "html", "verbose"],
      server: {
        deps: {
          // vue-demi/@vueuse externalized would load Vue's CJS build while
          // the code under test uses the ESM build — two reactivity
          // instances, silent tracking failures. Inline them all so vite
          // resolves ONE vue everywhere.
          inline: ["@vue/test-utils", "@vueuse/core", "@vueuse/shared", "vue-demi"],
        },
      },
      coverage: {
        include: ['lib/**']
      }
    },
  })
);
