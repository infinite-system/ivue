/*
=== GENERATOR ===
Goal: Prove the configuration layer reads its three settings in one order — the kit entry's props, then the page's settings store, then the shipped default — and that the shipped Chat below it never reads either.
[Configuration is a layer](./ai-chat.invariants.md#configuration-is-a-layer)
// domain-invariant: $ConfiguredChat — If a setting is asked, then the entry's value wins, the settings store is next, and the shipped default is last; the base class answers only its default
Impossible if true: the shipped Chat answers a theme the settings panel chose

=== GENERATOR-DESCRIBED ===
$ConfiguredChat is the getter layer over $Chat: theme, density and tree, each `entry ?? settings ?? super`.
*/
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chat } from './Chat';
import { ChatSettings } from './ChatSettings';
import { ConfiguredChat } from './ConfiguredChat';
import { ChatVariants } from './variants/ChatVariants';
import { hosted } from '../virtual-scroller/hosted';

describe('ConfiguredChat', () => {
  afterEach(() => {
    ChatSettings.Class.reset();
    vi.restoreAllMocks();
  });

  // domain-invariant: $ConfiguredChat — If a setting is asked, then the entry's value wins, the settings store is next, and the shipped default is last; the base class answers only its default
  // impossible-if-true: $ConfiguredChat — the shipped Chat answers a theme the settings panel chose
  // invariant: Configuration is a layer (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('the entry wins, then the settings, then the default — and the shipped class knows none of it', () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const settings = ChatSettings.Class.use();
    const shipped = hosted(() => new Chat.Class());
    const configured = hosted(() => new ConfiguredChat.Class());
    const pinned = hosted(
      () =>
        new ConfiguredChat.Class({
          kit: { namespace: ConfiguredChat, vue: {} as never, props: { theme: 'terminal' } }
        })
    );
    expect(configured.instance.theme).toBe('midnight');
    settings.theme.value = 'ivory';
    settings.density.value = 'compact';
    settings.tree.value = 'bubbles';
    expect(configured.instance.theme).toBe('ivory');
    expect(configured.instance.density).toBe('compact');
    expect(configured.instance.tree).toBe('bubbles');
    expect(pinned.instance.theme).toBe('terminal'); // the entry's word beats the settings
    expect(pinned.instance.density).toBe('compact'); // no entry word for density: the settings
    expect(shipped.instance.theme).toBe('midnight'); // the base never reads the store
    expect(shipped.instance.tree).toBe('shipped');
    // the trees are derivations over the configured chat; the shipped tree is the configured chat itself
    expect(ChatVariants.Class.tree('shipped').namespace).toBe(ConfiguredChat);
    expect(ChatVariants.Class.tree('bubbles').namespace.derivedFrom).toBe(ConfiguredChat);
    expect(ChatVariants.Class.tree('nope').id).toBe('shipped');
    expect(ConfiguredChat.Class.$kit.Message).toBe(
      Chat.Class.$kit.Message === ConfiguredChat.Class.$kit.Message
        ? Chat.Class.$kit.Message
        : ConfiguredChat.Class.$kit.Message
    );
    pinned.unmount();
    configured.unmount();
    shipped.unmount();
  });
});
