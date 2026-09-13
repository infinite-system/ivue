import { Reactive } from '../../ivue';
import { Static } from '../../Static';

// The chat's glyphs, one 24-grid stroke path each, so every icon draws
// at the same weight and the rail, the composer and the index share the
// same search. Data only: any class in the tree may read it.
class $Icons {
  static readonly PATHS = {
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.6-4.6',
    files:
      'M4 6.5A1.5 1.5 0 0 1 5.5 5H9l2 2h7.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM4 11h16',
    settings:
      'M4 7h4M12 7h8M12 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0M4 17h8M16 17h4M16 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    collapse: 'M6 6l6 6-6 6M13 6l6 6-6 6',
    /** the disclosure chevron — every fold in the chat turns this one */
    chevron: 'M9 6l6 6-6 6',
    /** copy a block to the clipboard, and the check that says it went */
    copy: 'M9 9h10v10H9zM5 15V5h10',
    check: 'M5 12l4 4L19 6',
    /** go to a message in the thread */
    jump: 'M4 12h15M13 6l6 6-6 6',
    /** open somewhere else — the index on a file */
    open: 'M7 17 17 7M9 7h8v8',
    /** close a panel or a card */
    close: 'M6 6l12 12M18 6L6 18',
    /** save the selection to a file */
    download: 'M12 4v12M6 10l6 6 6-6M4 20h16',
    /** a tool call — the wrench beside a count */
    wrench:
      'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
    /** a straight arrow, drawn down; the order toggle turns it up */
    arrow: 'M12 5v14M5 12l7 7 7-7',
    /** the more menu — the side panels, on a phone */
    more: 'M5 12h.01M12 12h.01M19 12h.01'
  };
}

export namespace Icons {
  export const $Class = Static($Icons);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Name = keyof typeof $Icons.PATHS;
}
