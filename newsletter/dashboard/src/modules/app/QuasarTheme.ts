import { Static } from 'ivue/extras';

// Quasar's brand, set from the dashboard's own tokens (styles.css) so a
// QBtn and a .primary button read as one system. Dark is forced: the
// admin has one look. Notify defaults sit here too — every toast the
// press module raises comes out the same corner.
class $QuasarTheme {
  static readonly BRAND = {
    primary: '#6366f1', // --accent-strong
    secondary: '#818cf8', // --accent
    accent: '#34d399', // --accent-2
    dark: '#11151e', // --panel
    'dark-page': '#0a0d13', // --bg
    positive: '#34d399', // --accent-2
    negative: '#f87171', // --danger
    info: '#60a5fa',
    warning: '#fbbf24',
  };

  static readonly CONFIG = {
    dark: true as const,
    brand: this.BRAND,
    notify: {
      position: 'bottom-right' as const,
      timeout: 4500,
      textColor: 'white',
    },
  };
}

export namespace QuasarTheme {
  export const $Class = Static($QuasarTheme);
  export let Class = $Class;
}
