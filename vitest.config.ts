import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import { configDefaults, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      exclude: [...configDefaults.exclude, "e2e/*", "**/demo/**"],
      root: fileURLToPath(new URL("./", import.meta.url)),
      reporters: ["default", "html", "verbose"],
      coverage: {
        include: ['src/**']
      } 
    },
  })
);
