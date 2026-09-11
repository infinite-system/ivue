import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { ChatApi } from './ChatApi';
import type { Composer } from './Composer';
import type { Kit } from '../../kit/Kit';

// The model pill and its menu: every model as a card with its speed and
// its first-token wait, drawn to one scale so the cards compare at a
// glance. Arrow keys walk the cards, Enter picks, Escape closes, and a
// press anywhere else closes it too. The picked id lives on the
// composer; this class owns only the menu.
class $ModelPicker {
  /** an icon per model id — a bolt for the quick one, scales for the balanced, a brain for the deep; anything else gets a dot */
  static readonly ICONS: Record<string, string> = {
    quick: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
    default: 'M12 3v18M5 7l7-4 7 4M3 15l2-8 2 8a2 2 0 0 1-4 0zM17 15l2-8 2 8a2 2 0 0 1-4 0z',
    deep: 'M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 5 3 3 0 0 0 2 5v1a3 3 0 0 0 6 0V4a3 3 0 0 0-3 0zM15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 5 3 3 0 0 1-2 5v1a3 3 0 0 1-6 0V4a3 3 0 0 1 3 0z'
  };
  static readonly DOT = 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z';

  constructor(public props: ModelPicker.Props) {
    onMounted(() => document.addEventListener('pointerdown', this.onDocumentPointerDown));
    onBeforeUnmount(() => document.removeEventListener('pointerdown', this.onDocumentPointerDown));
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ModelPicker;
  }

  get composer(): Composer.Model {
    return this.props.composer;
  }

  get open() {
    return ref(false);
  }

  /** the card the keyboard is on — the picked one when the menu opens */
  get cursor() {
    return ref(0);
  }

  // TEMPLATE-REF TARGET — the pill and menu together, for the outside-press test
  get rootElement() {
    return ref<HTMLElement | null>(null);
  }

  get models(): ChatApi.Model[] {
    return this.composer.models;
  }

  get picked(): ChatApi.Model {
    return this.composer.model;
  }

  get pickedLabel(): string {
    return this.picked.label;
  }

  get pickedIcon(): string {
    return this.iconFor(this.picked);
  }

  /** the fastest model sets the scale every speed bar is drawn to */
  get topSpeed(): number {
    return Math.max(...this.models.map((model) => model.tokensPerSecond), 1);
  }

  get slowestFirstToken(): number {
    return Math.max(...this.models.map((model) => model.firstTokenMs), 1);
  }

  get menuClass(): Record<string, boolean> {
    return { 'ac-picker-open': this.open.value };
  }

  iconFor(model: ChatApi.Model): string {
    return this.self.ICONS[model.id] ?? this.self.DOT;
  }

  isPicked(model: ChatApi.Model): boolean {
    return model.id === this.picked.id;
  }

  isUnderCursor(model: ChatApi.Model): boolean {
    return this.models[this.cursor.value]?.id === model.id;
  }

  cardClass(model: ChatApi.Model): Record<string, boolean> {
    return { 'ac-picked': this.isPicked(model), 'ac-cursor': this.isUnderCursor(model) };
  }

  speedLabel(model: ChatApi.Model): string {
    return `${model.tokensPerSecond} tok/s`;
  }

  /** width of the speed bar, in percent of the fastest */
  speedStyle(model: ChatApi.Model): Record<string, string> {
    return { width: `${Math.round((model.tokensPerSecond / this.topSpeed) * 100)}%` };
  }

  firstTokenLabel(model: ChatApi.Model): string {
    return `first token ~${(model.firstTokenMs / 1000).toFixed(1)}s`;
  }

  waitStyle(model: ChatApi.Model): Record<string, string> {
    return { width: `${Math.round((model.firstTokenMs / this.slowestFirstToken) * 100)}%` };
  }

  toggle() {
    if (this.open.value) this.close();
    else this.show();
  }

  show() {
    this.cursor.value = Math.max(
      0,
      this.models.findIndex((model) => this.isPicked(model))
    );
    this.open.value = true;
  }

  close() {
    this.open.value = false;
  }

  pick(model: ChatApi.Model) {
    this.composer.modelId.value = model.id;
    this.close();
  }

  /** the keyboard walks the cards while the pill has focus */
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.open.value) this.show();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.cursor.value = (this.cursor.value + step + this.models.length) % this.models.length;
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.open.value) this.show();
      else this.pick(this.models[this.cursor.value]);
    }
  }

  onDocumentPointerDown(event: PointerEvent) {
    const root = this.rootElement.value;
    if (!root || !this.open.value) return;
    if (!root.contains(event.target as Node)) this.close();
  }
}

export namespace ModelPicker {
  export const $Class = Static($ModelPicker);
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;

  export interface Props {
    composer: Composer.Model;
    kit?: Kit.Entry;
  }
}
