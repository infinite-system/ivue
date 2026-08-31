# Type-check gate for the docs theme

**Status: parked (pre-release scope guard). Trigger: post-release.**

The docs theme (`docs_v2/.vitepress/theme/`) has NO type-check gate:
root tsconfig includes only `lib` + markdown, and VitePress builds via
esbuild (strips types, checks nothing). Consequence: the protected/
override doctrine — and noImplicitOverride specifically — cannot bite
on the theme's ivue classes (NewsletterSignup, BlogDripShowcase, …),
and type errors there surface only at runtime.

Trial (2026-08-31) of adding `docs_v2/.vitepress/theme/**/*.ts` to the
root include produced infra noise, not real defects: `.vue` imports
need a shim/vue-tsc, `.data.mjs` loaders need type declarations,
implicit-any in data-loader consumers.

## The work
- vue-tsc pass for the theme (or a docs_v2 tsconfig project with
  vue shims + `noImplicitOverride: true`)
- type declarations for the .data.mjs loaders (blog.data, blog-lite,
  pages-lite)
- wire into the build gate (build:docs or a check:docs-types script)
