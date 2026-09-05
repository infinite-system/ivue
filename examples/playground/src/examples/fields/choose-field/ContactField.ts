import type { ExtractPropTypes, PropType } from 'vue';

import {
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
  definePropTypes,
  propsWithDefaults,
  Reactive,
} from '../../../ivue';
import { Static } from '../../../Static';
import { ChooseField } from './ChooseField';

/**
 * ContactField — ChooseField SUBCLASSED for the '/contact' endpoint:
 * avatar-decorated options and chips in two display modes (full /
 * compact). The class extends the base AND its contract in one motion —
 * the static getters below spread `super` and re-tune only what differs;
 * ContactField.vue constructs THIS instance with its own props and emit
 * and hands it to the base SFC through the `runner` prop (the ported v1
 * mechanism) — every inherited behavior (fetch, filter, variants,
 * chips) and every member below live on ONE object, driving both
 * templates.
 */
class $ContactField extends ChooseField.$Class {
  /* Contract — the choose-field contract, preconfigured for contacts:
     chips on, server search + pagination against '/contact',
     contact-shaped label/description priorities — plus one prop of its
     own, `compact`. Every line here is a DIFFERENCE from the base. */

  static override get propsTypes() {
    return definePropTypes({
      ...super.propsTypes,

      /** Compact display mode: smaller avatar, name only, denser rows. */
      compact: { type: Boolean as PropType<boolean> },
    });
  }

  static override get propsDefaults(): ExtractPropDefaultTypes<
    typeof $ContactField.propsTypes
  > {
    return {
      ...super.propsDefaults,

      /** Choose Field overrides. */
      useChips: true,
      roundChips: true,
      useInput: true,
      hideDropdownIcon: true,
      // fetchPath is NOT defaulted here — the class overrides the getter with
      // a super chain (`super.fetchPath || '/contact'`), the ported v1 idiom:
      // an explicit prop still wins, and the endpoint is behavior, not config.
      fetchSearch: true,
      fetchPagination: true,
      fetchRowsPerPage: 8,
      fetchSort: 'name:asc',
      optionLabelPriority: ['name', 'email', 'id'],
      optionDescriptionPriority: ['role', 'company', 'email'],
      createLabel: 'Create contact',

      /** Custom contact params. */
      compact: false,
    };
  }

  /** Re-declared so `ContactField.Props` carries `compact`. */
  static override get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  // Widen the inherited surfaces to the contact contract — the ported v1
  // idiom (`declare` emits nothing at runtime; the base constructor
  // assigned these).
  declare props: ContactField.Props;
  declare emit: ContactField.Emits;

  /* Props */

  get compact() {
    return this.props.compact;
  }

  /* Derived — the contact decoration vocabulary, named */

  get rootClass() {
    return this.compact ? 'contact-field--compact' : 'contact-field--full';
  }

  get avatarSize() {
    return this.compact ? 20 : 32;
  }

  get chipAvatarSize() {
    return this.compact ? 16 : 22;
  }

  get chipSize() {
    return this.compact ? '12px' : '14px';
  }

  /** Full mode shows the email line under the name — when there is one. */
  /** The avatar's name for an option — empty while the option is unresolved. */
  optionName(option: { name?: string } | null | undefined) {
    return option?.name ?? '';
  }

  showEmail(option: { email?: string } | undefined): boolean {
    return !this.compact && !!option?.email;
  }

  /* Overrides — behavior extensions over the base, super-chained so an
     explicit prop always wins (ported v1 idiom) */

  /**
   * The contact endpoint is BEHAVIOR, not a default: unset resolves to
   * '/contact', an explicit `fetch-path` prop still wins.
   * @extends @see {$ChooseField.fetchPath}
   */
  override get fetchPath() {
    return super.fetchPath || '/contact';
  }

  /**
   * Typing a new value creates a contact when options are keyed by
   * email — 'add-unique' keeps the list deduplicated.
   * @extends @see {$ChooseField.newValueMode}
   */
  override get newValueMode() {
    return (
      super.newValueMode ??
      (this.optionValue === 'email' ? 'add-unique' : super.newValueMode)
    );
  }
}

export namespace ContactField {
  /* Identity */

  export const $Class = Static($ContactField); // anchor — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /* Types — DERIVED from the class's statics (emits are inherited whole) */

  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Emits = ExtractEmitTypes<typeof $Class.emits>;
}
