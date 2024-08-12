// vitest.config.ts
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { mergeConfig } from "file:///Users/light/dev/ivue/node_modules/vite/dist/node/index.js";
import { configDefaults, defineConfig as defineConfig2 } from "file:///Users/light/dev/ivue/node_modules/vitest/dist/config.js";

// vite.config.ts
import { fileURLToPath, URL as URL2 } from "node:url";
import { defineConfig } from "file:///Users/light/dev/ivue/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/light/dev/ivue/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import dts from "file:///Users/light/dev/ivue/node_modules/vite-plugin-dts/dist/index.mjs";

// package.json
var package_default = {
  name: "ivue",
  version: "1.0.2",
  description: "Infinite Vue \u2013 Class Based Architecture for Vue 3",
  type: "module",
  exports: {
    ".": {
      require: "./dist/index.umd.js",
      import: "./dist/index.es.js",
      types: "./dist/src/index.d.ts"
    }
  },
  main: "./dist/index.umd.js",
  module: "./dist/index.es.js",
  types: "./dist/src/index.d.ts",
  scripts: {
    dev: "vite dev --host",
    test: "vitest --coverage.enabled=true --reporter=verbose --ui",
    coverage: "vitest run --coverage",
    cypress: "cypress run --component",
    "cypress:headed": "cypress run --component --browser chrome --headed --no-exit",
    build: "vite build"
  },
  peerDependencies: {
    vue: "^3.0.0"
  },
  devDependencies: {
    "@cypress/vite-dev-server": "^5.0.2",
    "@cypress/vue": "^5.0.3",
    "@typescript-eslint/eslint-plugin": "^5.10.0",
    "@typescript-eslint/parser": "^5.10.0",
    "@vitejs/plugin-vue": "^4.0.0",
    "@vitest/coverage-c8": "^0.26.2",
    "@vitest/coverage-v8": "^2.0.5",
    "@vitest/ui": "^2.0.5",
    "@vue/test-utils": "^2.2.7",
    "cpy-cli": "^4.2.0",
    cypress: "^12.3.0",
    eslint: "^8.10.0",
    "eslint-config-prettier": "^8.1.0",
    "eslint-plugin-cypress": "^2.15.1",
    "eslint-plugin-import": "^2.29.1",
    "eslint-plugin-storybook": "^0.6.12",
    "eslint-plugin-vue": "^9.14.1",
    jsdom: "^21.0.0",
    typescript: "^4.5.4",
    vite: "^4.0.4",
    "vite-plugin-dts": "^1.7.1",
    "vite-plugin-dynamic-import": "^1.5.0",
    "vite-plugin-libcss": "^1.0.5",
    "vite-tsconfig-paths": "^4.3.2",
    vitest: "^2.0.5",
    vue: "^3.2.45",
    "vue-router": "^4.1.6"
  },
  repository: {
    type: "git",
    url: "https://github.com/infinite-system/ivue"
  },
  homepage: "https://github.com/infinite-system/ivue",
  bugs: {
    url: "https://github.com/infinite-system/ivue/issues",
    email: "ekalashnikov@gmail.com"
  },
  keywords: [
    "Vue",
    "Vue 3",
    "VueJs",
    "ivue",
    "class",
    "reactive class",
    "class composable",
    "vue class based architecture"
  ],
  author: {
    name: "Evgeny Kalashnikov",
    email: "ekalashnikov@gmail.com"
  },
  license: "MIT"
};

// vite.config.ts
import libCss from "file:///Users/light/dev/ivue/node_modules/vite-plugin-libcss/index.js";
var __vite_injected_original_import_meta_url = "file:///Users/light/dev/ivue/vite.config.ts";
var vueDocsPlugin = () => ({
  name: "vue-docs",
  transform(code, id) {
    if (!/vue&type=docs/.test(id)) return;
    return `export default ''`;
  }
});
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL2("./src", __vite_injected_original_import_meta_url))
    }
  },
  server: {
    fs: {
      allow: [".."]
    }
  },
  plugins: [
    vue(),
    dts({
      cleanVueFileName: true
    }),
    vueDocsPlugin(),
    libCss()
  ],
  build: {
    cssCodeSplit: true,
    lib: {
      entry: "./src/index.ts",
      formats: ["es", "umd"],
      // the name expose in umd mode
      name: package_default.name,
      fileName: (format) => `index.${format}.js`
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue"
        }
      }
    }
  }
});

// vitest.config.ts
var __vite_injected_original_import_meta_url2 = "file:///Users/light/dev/ivue/vitest.config.ts";
var vitest_config_default = mergeConfig(
  vite_config_default,
  defineConfig2({
    test: {
      environment: "jsdom",
      exclude: [...configDefaults.exclude, "e2e/*", "**/demo/**"],
      root: fileURLToPath2(new URL("./", __vite_injected_original_import_meta_url2)),
      reporters: ["default", "html", "verbose"],
      coverage: {
        include: ["src/**"]
      }
    }
  })
);
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyIsICJ2aXRlLmNvbmZpZy50cyIsICJwYWNrYWdlLmpzb24iXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbGlnaHQvZGV2L2l2dWVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9saWdodC9kZXYvaXZ1ZS92aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9saWdodC9kZXYvaXZ1ZS92aXRlc3QuY29uZmlnLnRzXCI7aW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gXCJub2RlOnVybFwiO1xuaW1wb3J0IHsgbWVyZ2VDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgY29uZmlnRGVmYXVsdHMsIGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlc3QvY29uZmlnXCI7XG5pbXBvcnQgdml0ZUNvbmZpZyBmcm9tIFwiLi92aXRlLmNvbmZpZ1wiO1xuXG5leHBvcnQgZGVmYXVsdCBtZXJnZUNvbmZpZyhcbiAgdml0ZUNvbmZpZyxcbiAgZGVmaW5lQ29uZmlnKHtcbiAgICB0ZXN0OiB7XG4gICAgICBlbnZpcm9ubWVudDogXCJqc2RvbVwiLFxuICAgICAgZXhjbHVkZTogWy4uLmNvbmZpZ0RlZmF1bHRzLmV4Y2x1ZGUsIFwiZTJlLypcIiwgXCIqKi9kZW1vLyoqXCJdLFxuICAgICAgcm9vdDogZmlsZVVSTFRvUGF0aChuZXcgVVJMKFwiLi9cIiwgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICByZXBvcnRlcnM6IFtcImRlZmF1bHRcIiwgXCJodG1sXCIsIFwidmVyYm9zZVwiXSxcbiAgICAgIGNvdmVyYWdlOiB7XG4gICAgICAgIGluY2x1ZGU6IFsnc3JjLyoqJ11cbiAgICAgIH0gXG4gICAgfSxcbiAgfSlcbik7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9saWdodC9kZXYvaXZ1ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2xpZ2h0L2Rldi9pdnVlL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9saWdodC9kZXYvaXZ1ZS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGZpbGVVUkxUb1BhdGgsIFVSTCB9IGZyb20gJ25vZGU6dXJsJ1xuXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgZHRzIGZyb20gXCJ2aXRlLXBsdWdpbi1kdHNcIjtcbmltcG9ydCBwa2cgZnJvbSBcIi4vcGFja2FnZS5qc29uXCI7XG5pbXBvcnQgbGliQ3NzIGZyb20gJ3ZpdGUtcGx1Z2luLWxpYmNzcyc7XG5cbmV4cG9ydCBjb25zdCB2dWVEb2NzUGx1Z2luID0gKCkgPT4gKHtcbiAgbmFtZTogXCJ2dWUtZG9jc1wiLFxuICB0cmFuc2Zvcm0gKGNvZGU6IGFueSwgaWQ6IGFueSkge1xuICAgIGlmICghL3Z1ZSZ0eXBlPWRvY3MvLnRlc3QoaWQpKSByZXR1cm47XG4gICAgcmV0dXJuIGBleHBvcnQgZGVmYXVsdCAnJ2A7XG4gIH1cbn0pO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLCBpbXBvcnQubWV0YS51cmwpKVxuICAgIH1cbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgZnM6IHtcbiAgICAgIGFsbG93OiBbJy4uJ11cbiAgICB9XG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICBkdHMoe1xuICAgICAgY2xlYW5WdWVGaWxlTmFtZTogdHJ1ZSxcbiAgICB9KSxcbiAgICB2dWVEb2NzUGx1Z2luKCksXG4gICAgbGliQ3NzKClcbiAgXSxcbiAgYnVpbGQ6IHtcbiAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogXCIuL3NyYy9pbmRleC50c1wiLFxuICAgICAgZm9ybWF0czogW1wiZXNcIiwgXCJ1bWRcIl0sXG4gICAgICAvLyB0aGUgbmFtZSBleHBvc2UgaW4gdW1kIG1vZGVcbiAgICAgIG5hbWU6IHBrZy5uYW1lLFxuICAgICAgZmlsZU5hbWU6IChmb3JtYXQpID0+IGBpbmRleC4ke2Zvcm1hdH0uanNgLFxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFtcInZ1ZVwiXSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBnbG9iYWxzOiB7XG4gICAgICAgICAgdnVlOiBcIlZ1ZVwiXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KVxuIiwgIntcbiAgXCJuYW1lXCI6IFwiaXZ1ZVwiLFxuICBcInZlcnNpb25cIjogXCIxLjAuMlwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiSW5maW5pdGUgVnVlIFx1MjAxMyBDbGFzcyBCYXNlZCBBcmNoaXRlY3R1cmUgZm9yIFZ1ZSAzXCIsXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxuICBcImV4cG9ydHNcIjoge1xuICAgIFwiLlwiOiB7XG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3QvaW5kZXgudW1kLmpzXCIsXG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9pbmRleC5lcy5qc1wiLFxuICAgICAgXCJ0eXBlc1wiOiBcIi4vZGlzdC9zcmMvaW5kZXguZC50c1wiXG4gICAgfVxuICB9LFxuICBcIm1haW5cIjogXCIuL2Rpc3QvaW5kZXgudW1kLmpzXCIsXG4gIFwibW9kdWxlXCI6IFwiLi9kaXN0L2luZGV4LmVzLmpzXCIsXG4gIFwidHlwZXNcIjogXCIuL2Rpc3Qvc3JjL2luZGV4LmQudHNcIixcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImRldlwiOiBcInZpdGUgZGV2IC0taG9zdFwiLFxuICAgIFwidGVzdFwiOiBcInZpdGVzdCAtLWNvdmVyYWdlLmVuYWJsZWQ9dHJ1ZSAtLXJlcG9ydGVyPXZlcmJvc2UgLS11aVwiLFxuICAgIFwiY292ZXJhZ2VcIjogXCJ2aXRlc3QgcnVuIC0tY292ZXJhZ2VcIixcbiAgICBcImN5cHJlc3NcIjogXCJjeXByZXNzIHJ1biAtLWNvbXBvbmVudFwiLFxuICAgIFwiY3lwcmVzczpoZWFkZWRcIjogXCJjeXByZXNzIHJ1biAtLWNvbXBvbmVudCAtLWJyb3dzZXIgY2hyb21lIC0taGVhZGVkIC0tbm8tZXhpdFwiLFxuICAgIFwiYnVpbGRcIjogXCJ2aXRlIGJ1aWxkXCJcbiAgfSxcbiAgXCJwZWVyRGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcInZ1ZVwiOiBcIl4zLjAuMFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBjeXByZXNzL3ZpdGUtZGV2LXNlcnZlclwiOiBcIl41LjAuMlwiLFxuICAgIFwiQGN5cHJlc3MvdnVlXCI6IFwiXjUuMC4zXCIsXG4gICAgXCJAdHlwZXNjcmlwdC1lc2xpbnQvZXNsaW50LXBsdWdpblwiOiBcIl41LjEwLjBcIixcbiAgICBcIkB0eXBlc2NyaXB0LWVzbGludC9wYXJzZXJcIjogXCJeNS4xMC4wXCIsXG4gICAgXCJAdml0ZWpzL3BsdWdpbi12dWVcIjogXCJeNC4wLjBcIixcbiAgICBcIkB2aXRlc3QvY292ZXJhZ2UtYzhcIjogXCJeMC4yNi4yXCIsXG4gICAgXCJAdml0ZXN0L2NvdmVyYWdlLXY4XCI6IFwiXjIuMC41XCIsXG4gICAgXCJAdml0ZXN0L3VpXCI6IFwiXjIuMC41XCIsXG4gICAgXCJAdnVlL3Rlc3QtdXRpbHNcIjogXCJeMi4yLjdcIixcbiAgICBcImNweS1jbGlcIjogXCJeNC4yLjBcIixcbiAgICBcImN5cHJlc3NcIjogXCJeMTIuMy4wXCIsXG4gICAgXCJlc2xpbnRcIjogXCJeOC4xMC4wXCIsXG4gICAgXCJlc2xpbnQtY29uZmlnLXByZXR0aWVyXCI6IFwiXjguMS4wXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLWN5cHJlc3NcIjogXCJeMi4xNS4xXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLWltcG9ydFwiOiBcIl4yLjI5LjFcIixcbiAgICBcImVzbGludC1wbHVnaW4tc3Rvcnlib29rXCI6IFwiXjAuNi4xMlwiLFxuICAgIFwiZXNsaW50LXBsdWdpbi12dWVcIjogXCJeOS4xNC4xXCIsXG4gICAgXCJqc2RvbVwiOiBcIl4yMS4wLjBcIixcbiAgICBcInR5cGVzY3JpcHRcIjogXCJeNC41LjRcIixcbiAgICBcInZpdGVcIjogXCJeNC4wLjRcIixcbiAgICBcInZpdGUtcGx1Z2luLWR0c1wiOiBcIl4xLjcuMVwiLFxuICAgIFwidml0ZS1wbHVnaW4tZHluYW1pYy1pbXBvcnRcIjogXCJeMS41LjBcIixcbiAgICBcInZpdGUtcGx1Z2luLWxpYmNzc1wiOiBcIl4xLjAuNVwiLFxuICAgIFwidml0ZS10c2NvbmZpZy1wYXRoc1wiOiBcIl40LjMuMlwiLFxuICAgIFwidml0ZXN0XCI6IFwiXjIuMC41XCIsXG4gICAgXCJ2dWVcIjogXCJeMy4yLjQ1XCIsXG4gICAgXCJ2dWUtcm91dGVyXCI6IFwiXjQuMS42XCJcbiAgfSxcbiAgXCJyZXBvc2l0b3J5XCI6IHtcbiAgICBcInR5cGVcIjogXCJnaXRcIixcbiAgICBcInVybFwiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9pbmZpbml0ZS1zeXN0ZW0vaXZ1ZVwiXG4gIH0sXG4gIFwiaG9tZXBhZ2VcIjogXCJodHRwczovL2dpdGh1Yi5jb20vaW5maW5pdGUtc3lzdGVtL2l2dWVcIixcbiAgXCJidWdzXCI6IHtcbiAgICBcInVybFwiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9pbmZpbml0ZS1zeXN0ZW0vaXZ1ZS9pc3N1ZXNcIixcbiAgICBcImVtYWlsXCI6IFwiZWthbGFzaG5pa292QGdtYWlsLmNvbVwiXG4gIH0sXG4gIFwia2V5d29yZHNcIjogW1xuICAgIFwiVnVlXCIsXG4gICAgXCJWdWUgM1wiLFxuICAgIFwiVnVlSnNcIixcbiAgICBcIml2dWVcIixcbiAgICBcImNsYXNzXCIsXG4gICAgXCJyZWFjdGl2ZSBjbGFzc1wiLFxuICAgIFwiY2xhc3MgY29tcG9zYWJsZVwiLFxuICAgIFwidnVlIGNsYXNzIGJhc2VkIGFyY2hpdGVjdHVyZVwiXG4gIF0sXG4gIFwiYXV0aG9yXCI6IHtcbiAgICBcIm5hbWVcIjogXCJFdmdlbnkgS2FsYXNobmlrb3ZcIixcbiAgICBcImVtYWlsXCI6IFwiZWthbGFzaG5pa292QGdtYWlsLmNvbVwiXG4gIH0sXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiXG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFQLFNBQVMsaUJBQUFBLHNCQUFxQjtBQUNuUixTQUFTLG1CQUFtQjtBQUM1QixTQUFTLGdCQUFnQixnQkFBQUMscUJBQW9COzs7QUNGb00sU0FBUyxlQUFlLE9BQUFDLFlBQVc7QUFFcFIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sU0FBUzs7O0FDSmhCO0FBQUEsRUFDRSxNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsRUFDWCxhQUFlO0FBQUEsRUFDZixNQUFRO0FBQUEsRUFDUixTQUFXO0FBQUEsSUFDVCxLQUFLO0FBQUEsTUFDSCxTQUFXO0FBQUEsTUFDWCxRQUFVO0FBQUEsTUFDVixPQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQVE7QUFBQSxFQUNSLFFBQVU7QUFBQSxFQUNWLE9BQVM7QUFBQSxFQUNULFNBQVc7QUFBQSxJQUNULEtBQU87QUFBQSxJQUNQLE1BQVE7QUFBQSxJQUNSLFVBQVk7QUFBQSxJQUNaLFNBQVc7QUFBQSxJQUNYLGtCQUFrQjtBQUFBLElBQ2xCLE9BQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxrQkFBb0I7QUFBQSxJQUNsQixLQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsaUJBQW1CO0FBQUEsSUFDakIsNEJBQTRCO0FBQUEsSUFDNUIsZ0JBQWdCO0FBQUEsSUFDaEIsb0NBQW9DO0FBQUEsSUFDcEMsNkJBQTZCO0FBQUEsSUFDN0Isc0JBQXNCO0FBQUEsSUFDdEIsdUJBQXVCO0FBQUEsSUFDdkIsdUJBQXVCO0FBQUEsSUFDdkIsY0FBYztBQUFBLElBQ2QsbUJBQW1CO0FBQUEsSUFDbkIsV0FBVztBQUFBLElBQ1gsU0FBVztBQUFBLElBQ1gsUUFBVTtBQUFBLElBQ1YsMEJBQTBCO0FBQUEsSUFDMUIseUJBQXlCO0FBQUEsSUFDekIsd0JBQXdCO0FBQUEsSUFDeEIsMkJBQTJCO0FBQUEsSUFDM0IscUJBQXFCO0FBQUEsSUFDckIsT0FBUztBQUFBLElBQ1QsWUFBYztBQUFBLElBQ2QsTUFBUTtBQUFBLElBQ1IsbUJBQW1CO0FBQUEsSUFDbkIsOEJBQThCO0FBQUEsSUFDOUIsc0JBQXNCO0FBQUEsSUFDdEIsdUJBQXVCO0FBQUEsSUFDdkIsUUFBVTtBQUFBLElBQ1YsS0FBTztBQUFBLElBQ1AsY0FBYztBQUFBLEVBQ2hCO0FBQUEsRUFDQSxZQUFjO0FBQUEsSUFDWixNQUFRO0FBQUEsSUFDUixLQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsVUFBWTtBQUFBLEVBQ1osTUFBUTtBQUFBLElBQ04sS0FBTztBQUFBLElBQ1AsT0FBUztBQUFBLEVBQ1g7QUFBQSxFQUNBLFVBQVk7QUFBQSxJQUNWO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVU7QUFBQSxJQUNSLE1BQVE7QUFBQSxJQUNSLE9BQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxTQUFXO0FBQ2I7OztBRHpFQSxPQUFPLFlBQVk7QUFOK0gsSUFBTSwyQ0FBMkM7QUFRNUwsSUFBTSxnQkFBZ0IsT0FBTztBQUFBLEVBQ2xDLE1BQU07QUFBQSxFQUNOLFVBQVcsTUFBVyxJQUFTO0FBQzdCLFFBQUksQ0FBQyxnQkFBZ0IsS0FBSyxFQUFFLEVBQUc7QUFDL0IsV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUdBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssY0FBYyxJQUFJQyxLQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBLElBQ3REO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sSUFBSTtBQUFBLE1BQ0YsT0FBTyxDQUFDLElBQUk7QUFBQSxJQUNkO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osSUFBSTtBQUFBLE1BQ0Ysa0JBQWtCO0FBQUEsSUFDcEIsQ0FBQztBQUFBLElBQ0QsY0FBYztBQUFBLElBQ2QsT0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGNBQWM7QUFBQSxJQUNkLEtBQUs7QUFBQSxNQUNILE9BQU87QUFBQSxNQUNQLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQTtBQUFBLE1BRXJCLE1BQU0sZ0JBQUk7QUFBQSxNQUNWLFVBQVUsQ0FBQyxXQUFXLFNBQVMsTUFBTTtBQUFBLElBQ3ZDO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixVQUFVLENBQUMsS0FBSztBQUFBLE1BQ2hCLFFBQVE7QUFBQSxRQUNOLFNBQVM7QUFBQSxVQUNQLEtBQUs7QUFBQSxRQUNQO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzs7O0FEdERtSixJQUFNQyw0Q0FBMkM7QUFLck0sSUFBTyx3QkFBUTtBQUFBLEVBQ2I7QUFBQSxFQUNBQyxjQUFhO0FBQUEsSUFDWCxNQUFNO0FBQUEsTUFDSixhQUFhO0FBQUEsTUFDYixTQUFTLENBQUMsR0FBRyxlQUFlLFNBQVMsU0FBUyxZQUFZO0FBQUEsTUFDMUQsTUFBTUMsZUFBYyxJQUFJLElBQUksTUFBTUYseUNBQWUsQ0FBQztBQUFBLE1BQ2xELFdBQVcsQ0FBQyxXQUFXLFFBQVEsU0FBUztBQUFBLE1BQ3hDLFVBQVU7QUFBQSxRQUNSLFNBQVMsQ0FBQyxRQUFRO0FBQUEsTUFDcEI7QUFBQSxJQUNGO0FBQUEsRUFDRixDQUFDO0FBQ0g7IiwKICAibmFtZXMiOiBbImZpbGVVUkxUb1BhdGgiLCAiZGVmaW5lQ29uZmlnIiwgIlVSTCIsICJVUkwiLCAiX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCIsICJkZWZpbmVDb25maWciLCAiZmlsZVVSTFRvUGF0aCJdCn0K
