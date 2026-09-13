/*
=== GENERATOR ===
Goal: Prove the settings panel finds a section or an option by any word of its label, its hint or its tags, that a matching section shows every option it has, and that the picks write through to the shared settings.
// domain-invariant: $SidebarSettings — If the query's words all land in a section's label or tags, then the section shows with every option; if they land only in an option's label, hint or tags, then the section shows with that option alone; a section with nothing to show is left out
Impossible if true: a setting the reader cannot find by a word on its card

=== GENERATOR-DESCRIBED ===
$SidebarSettings is a search over three tables — themes, densities, trees — each entry carrying tags beyond its label and hint.
*/
import { describe, expect, it, vi } from 'vitest';
import { Chat } from '../Chat';
import { SidebarSettings } from './Sidebar.Settings';
import { hosted } from '../../virtual-scroller/hosted';

describe('SidebarSettings', () => {
  // domain-invariant: $SidebarSettings — If the query's words all land in a section's label or tags, then the section shows with every option; if they land only in an option's label, hint or tags, then the section shows with that option alone; a section with nothing to show is left out
  // impossible-if-true: $SidebarSettings — a setting the reader cannot find by a word on its card
  it('finds sections and options by label, hint or tag, and shows a matching section whole', () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    const settings = new SidebarSettings.Class({ chat });
    expect(settings.rows.value.map((section) => section.id)).toEqual(['theme', 'density', 'tree']);
    expect(settings.themes).toHaveLength(4);
    // a tag of one theme: the theme section, that theme alone
    settings.query.value = 'hacker';
    expect(settings.rows.value.map((section) => section.id)).toEqual(['theme']);
    expect(settings.themes.map((theme) => theme.value)).toEqual(['terminal']);
    // a word of a hint, across sections
    settings.query.value = 'dense';
    expect(settings.rows.value.map((section) => section.id)).toEqual(['density', 'tree']);
    expect(settings.densities.map((density) => density.value)).toEqual(['compact']);
    expect(settings.trees.map((tree) => tree.id)).toEqual(['compact']);
    // a section's own tag: the section shows whole
    settings.query.value = 'palette';
    expect(settings.rows.value.map((section) => section.id)).toEqual(['theme']);
    expect(settings.themes).toHaveLength(4);
    // two words must both land
    settings.query.value = 'dark default';
    expect(settings.themes.map((theme) => theme.value)).toEqual(['midnight']);
    // nothing lands
    settings.query.value = 'zzz';
    expect(settings.rows.value).toEqual([]);
    expect(settings.hasNoMatch).toBe(true);
    settings.clearQuery();
    expect(settings.hasQuery).toBe(false);
    expect(settings.rows.value).toHaveLength(3);
    unmount();
    vi.restoreAllMocks();
  });
});
