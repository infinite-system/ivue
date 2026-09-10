/*
=== GENERATOR ===
Goal: Prove the side is a rail of tabs whose panel opens for the chat's chosen tab and closes back to the rail, that every tab is an entry of the sidebar's own kit, and that the panel resizes only within its bounds.
[Rendering is a kit](../ai-chat.invariants.md#rendering-is-a-kit)
// domain-invariant: $Sidebar — If the chat names a tab, then the panel shows that tab's entry from the sidebar's kit; no tab, no panel; a width is clamped to the bounds
Impossible if true: a panel open with no tab named

=== GENERATOR-DESCRIBED ===
$Sidebar holds the rail's tabs and the panel's width; the open tab lives on the chat so the composer and the files panel can open it too.
*/
import { describe, expect, it, vi } from 'vitest';
import { Chat } from '../Chat';
import { Index } from '../Index';
import { FilesPanel } from './FilesPanel';
import { SettingsPanel } from './SettingsPanel';
import { Sidebar } from './Sidebar';
import { hosted } from '../../virtual-scroller/hosted';

describe('Sidebar', () => {
  // domain-invariant: $Sidebar — If the chat names a tab, then the panel shows that tab's entry from the sidebar's kit; no tab, no panel; a width is clamped to the bounds
  // impossible-if-true: $Sidebar — a panel open with no tab named
  // invariant: Rendering is a kit (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('opens the tab the chat names, from its own kit, closes to the rail, and resizes within bounds', () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const host = hosted(() => new Chat.Class());
    const chat = host.instance;
    const side = new Sidebar.Class({ chat });
    expect(side.isOpen).toBe(false);
    expect(side.entry).toBeNull();
    side.select(side.tabs[0]);
    expect(chat.sidebarTab.value).toBe('Index');
    expect(side.entry?.namespace).toBe(Index);
    side.select(side.tabs[1]);
    expect(side.entry?.namespace).toBe(FilesPanel);
    side.select(side.tabs[2]);
    expect(side.entry?.namespace).toBe(SettingsPanel);
    expect(side.isActive(side.tabs[2])).toBe(true);
    side.select(side.tabs[2]); // the same tab again collapses the panel
    expect(side.isOpen).toBe(false);
    chat.search('Chat.ts');
    expect(side.entry?.namespace).toBe(Index);
    side.close();
    expect(side.isOpen).toBe(false);
    side.resizeTo(100);
    expect(side.width.value).toBe(Sidebar.Class.MIN_WIDTH);
    side.resizeTo(5000);
    expect(side.width.value).toBe(Sidebar.Class.MAX_WIDTH);
    side.resizeTo(420);
    expect(side.panelStyle).toEqual({ width: '420px' });
    host.unmount();
  });
});
