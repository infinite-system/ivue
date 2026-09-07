declare module 'virtual:lazy-source-map' {
  export const loaders: Record<string, () => Promise<{ default: { html: string; lines: number; lang: string } }>>;
}
