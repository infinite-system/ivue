// quasar-loader.ts — Quasar installs lazily, on first entry into a field
// route. Non-Quasar routes never download a byte of it: the framework, its
// CSS and the icon font all live in the field routes' lazy chunks.
import type { App } from 'vue';

let app: App | null = null;
let installed = false;

export function registerApp(instance: App) {
  app = instance;
}

export async function installQuasar() {
  if (installed || !app) return;
  installed = true;
  const [{ Quasar }] = await Promise.all([
    import('quasar'),
    // layered so Quasar's body-level resets never restyle the shell
    import('./quasar-layered.css'),
  ]);
  app.use(Quasar, { config: { dark: true } }); // match the playground's dark shell
}
