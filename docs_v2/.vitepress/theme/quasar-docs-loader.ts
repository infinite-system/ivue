// quasar-docs-loader.ts — the docs app installs Quasar lazily, only when a
// page embeds a field example. Pages without field demos never download a
// byte of Quasar; the plugin, its CSS and the icon font ride in the field
// embeds' lazy chunks. Quasar's dark mode FOLLOWS the VitePress theme
// toggle, live.
import type { App } from 'vue';

let app: App | null = null;
let installing: Promise<void> | null = null;

export function registerDocsApp(instance: App) {
  app = instance;
}

export function installQuasar(): Promise<void> {
  installing ??= (async () => {
    if (!app) throw new Error('quasar-docs-loader: no app registered');
    const [{ Quasar, Dark }] = await Promise.all([
      import('quasar'),
      // layered so Quasar's body-level resets never restyle the docs chrome
      import('./quasar-layered.css'),
    ]);
    const isDocsDark = () => document.documentElement.classList.contains('dark');
    app.use(Quasar, { config: { dark: isDocsDark() } });
    // VitePress flips `html.dark` on toggle — mirror it into Quasar.
    new MutationObserver(() => Dark.set(isDocsDark())).observe(
      document.documentElement,
      { attributes: true, attributeFilter: ['class'] },
    );
  })();
  return installing;
}
