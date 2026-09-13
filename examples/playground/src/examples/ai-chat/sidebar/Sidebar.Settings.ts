import { computed, ref } from 'vue';
import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { VirtualScroller } from '../../virtual-scroller/VirtualScroller';
import VirtualScrollerView from '../../virtual-scroller/VirtualScroller.vue';
import type { Chat } from '../Chat';
import { Icons } from '../Icons';
import { ChatSettings } from '../ChatSettings';
import { TreeCatalog } from '../variants/TreeCatalog';

// The settings panel: the theme, the density and the tree. Every choice
// writes the page's settings store; the configuration layer reads the
// theme and the density on the next render, and the shell derives a new
// root for the tree. The panel shows the override each tree is, as data.
// Its sections are rows of its own scroller, like every list in the side.
class $SidebarSettings {
  /** the one role the panel composes: its own scroller over the sections */
  static get $kit(): SidebarSettings.Roles {
    return {
      Scroller: { view: VirtualScrollerView, namespace: VirtualScroller }
    };
  }

  /** the sections, in order — each a row of the scroller */
  static readonly SECTIONS: SidebarSettings.Section[] = [
    {
      id: 'theme',
      body: '',
      position: '1',
      label: 'Theme',
      tags: ['colors', 'palette', 'appearance', 'look', 'dark', 'light', 'mode']
    },
    {
      id: 'density',
      body: '',
      position: '2',
      label: 'Density',
      tags: ['spacing', 'size', 'padding', 'rows', 'zoom']
    },
    {
      id: 'tree',
      body: '',
      position: '3',
      label: 'Tree',
      tags: ['layout', 'template', 'variant', 'kit', 'override', 'shape', 'style']
    }
  ];

  /** Whether a query's words all land somewhere in a label, a hint or the tags. */
  static matches(words: string[], label: string, hint: string, tags: string[]): boolean {
    if (!words.length) return true;
    const haystack = `${label} ${hint} ${tags.join(' ')}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  }

  constructor(public props: SidebarSettings.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $SidebarSettings;
  }

  get kit() {
    return this.self.$kit;
  }

  get sections(): SidebarSettings.Section[] {
    return this.self.SECTIONS;
  }

  // MUTABLE STATE — the search
  get query() {
    return ref('');
  }

  // TEMPLATE-REF TARGET — the search box
  get searchElement() {
    return ref<HTMLInputElement | null>(null);
  }

  // computed: stable-handle — the scroller's modelValue must be ONE list per change of the query
  get rows() {
    return computed(() => this.filterSections());
  }

  get searchIcon(): string {
    return Icons.Class.PATHS.search;
  }

  /** the query as words, lowercased */
  get words(): string[] {
    return this.query.value.toLowerCase().split(/\s+/).filter(Boolean);
  }

  get hasQuery(): boolean {
    return this.words.length > 0;
  }

  get hasNoMatch(): boolean {
    return this.hasQuery && this.rows.value.length === 0;
  }

  protected get $settings(): ChatSettings.Model {
    return ChatSettings.Class.use();
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get closeIcon(): string {
    return Icons.Class.PATHS.close;
  }

  /** a section's own words match: then every option shows, whatever the words say of them */
  get themes(): ChatSettings.Option<ChatSettings.Theme>[] {
    return this.optionsOf('theme', ChatSettings.Class.THEMES);
  }

  get densities(): ChatSettings.Option<ChatSettings.Density>[] {
    return this.optionsOf('density', ChatSettings.Class.DENSITIES);
  }

  get trees(): TreeCatalog.Entry[] {
    return this.optionsOf('tree', TreeCatalog.Class.TREES);
  }

  get tree(): TreeCatalog.Entry {
    return TreeCatalog.Class.entry(this.$settings.tree.value);
  }

  /** the override the current tree is, as the reader would write it */
  get patch(): string {
    return this.tree.patch;
  }

  close() {
    this.chat.closeSidebar();
  }

  clearQuery() {
    this.query.value = '';
    this.searchElement.value?.focus();
  }

  /** the sections the query leaves: a section whose own words match, or one with a matching option */
  protected filterSections(): SidebarSettings.Section[] {
    const words = this.words;
    if (!words.length) return this.sections;
    return this.sections.filter(
      (section) =>
        this.sectionMatches(section) ||
        this.optionsOf(section.id, this.allOptions(section.id)).length > 0
    );
  }

  protected sectionMatches(section: SidebarSettings.Section): boolean {
    return this.self.matches(this.words, section.label, '', section.tags);
  }

  protected allOptions(id: SidebarSettings.SectionId): SidebarSettings.Choice[] {
    if (id === 'theme') return ChatSettings.Class.THEMES;
    if (id === 'density') return ChatSettings.Class.DENSITIES;
    return TreeCatalog.Class.TREES;
  }

  /** the options of a section the query leaves: all of them when the section itself matches */
  protected optionsOf<Choice extends SidebarSettings.Choice>(
    id: SidebarSettings.SectionId,
    options: Choice[]
  ): Choice[] {
    const words = this.words;
    if (!words.length) return options;
    const section = this.sections.find((entry) => entry.id === id);
    if (section && this.sectionMatches(section)) return options;
    return options.filter((option) =>
      this.self.matches(words, option.label, option.hint, option.tags)
    );
  }

  isSection(section: SidebarSettings.Section, id: SidebarSettings.SectionId): boolean {
    return section.id === id;
  }

  rowText(section: SidebarSettings.Section): string {
    return section.label;
  }

  isTheme(value: ChatSettings.Theme): boolean {
    return this.$settings.theme.value === value;
  }

  isDensity(value: ChatSettings.Density): boolean {
    return this.$settings.density.value === value;
  }

  isTree(tree: TreeCatalog.Entry): boolean {
    return this.$settings.tree.value === tree.id;
  }

  setTheme(value: ChatSettings.Theme) {
    this.$settings.theme.value = value;
  }

  setDensity(value: ChatSettings.Density) {
    this.$settings.density.value = value;
  }

  setTree(tree: TreeCatalog.Entry) {
    this.$settings.tree.value = tree.id;
  }
}

export namespace SidebarSettings {
  /** the roles this class composes — declared, so a view's props and this kit never name each other's inferred types */
  export type Roles = { Scroller: Kit.Entry<$SidebarSettings, undefined, typeof VirtualScroller> };
  export const $Class = Static($SidebarSettings);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export type Role = 'Scroller';
  export type SectionId = 'theme' | 'density' | 'tree';

  export interface Section extends VirtualScroller.BaseItem {
    id: SectionId;
    label: string;
    /** words a reader might search the section by */
    tags: string[];
  }

  /** what every option of every section has: the words a search reads */
  export interface Choice {
    label: string;
    hint: string;
    tags: string[];
  }

  export interface Props {
    chat: Chat.Model;
    kit?: Kit.Entry;
  }
}
