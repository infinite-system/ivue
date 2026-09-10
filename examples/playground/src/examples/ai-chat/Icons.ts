import { Reactive } from '../../ivue';
import { Static } from '../../Static';

// The chat's glyphs, one 24-grid stroke path each, so every icon draws
// at the same weight and the rail, the composer and the index share the
// same search. Data only: any class in the tree may read it.
class $Icons {
  static readonly PATHS = {
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.6-4.6',
    files: 'M4 6.5A1.5 1.5 0 0 1 5.5 5H9l2 2h7.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM4 11h16',
    settings: 'M4 7h4M12 7h8M12 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0M4 17h8M16 17h4M16 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    collapse: 'M6 6l6 6-6 6M13 6l6 6-6 6',
  };
}

export namespace Icons {
  export const $Class = Static($Icons);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Name = keyof typeof $Icons.PATHS;
}
