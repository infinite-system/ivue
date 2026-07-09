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
      exclude: [...configDefaults.exclude, "e2e/*", "**/demo/**"],
      root: fileURLToPath(new URL("./", import.meta.url)),
      reporters: ["default", "html", "verbose"],
      server: {
        deps: {
          inline: ["@vue/test-utils"],
        },
      },
      coverage: {
        include: ['lib/**']
      }
    },
  })
);
