import { Reactive } from '../../../ivue';
import { ChooseField } from './ChooseField';
import {
  contactFieldEmits,
  contactFieldParams,
  contactFieldParamsDefaults,
  contactFieldParamsTypes,
  contactFieldProps,
  type ContactFieldEmits,
  type ContactFieldProps,
} from './ContactFieldProps';

/**
 * ContactField — ChooseField SUBCLASSED for the '/contact' endpoint:
 * avatar-decorated options and chips in two display modes (full /
 * compact). The class extends the base the way the contract extends the
 * base's contract (ContactFieldProps.ts spreads ChooseFieldProps.ts);
 * ContactField.vue constructs THIS instance with its own props and emit
 * and hands it to the base SFC through the `runner` prop (the ported v1
 * mechanism) — every inherited behavior (fetch, filter, variants,
 * chips) and every member below live on ONE object, driving both
 * templates.
 */
class $ContactField extends ChooseField.$Class {
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
  showEmail(option: { email?: string } | undefined): boolean {
    return !this.compact && !!option?.email;
  }
}

export namespace ContactField {
  /* Identity */

  export const $Class = $ContactField; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /* Values — the contract, authored in ContactFieldProps.ts (tier 2),
     which spreads and re-defaults the choose-field contract. Consumers
     read it HERE. */

  export const paramsTypes = contactFieldParamsTypes;
  export const paramsDefaults = contactFieldParamsDefaults;
  export const params = contactFieldParams;
  export const props = contactFieldProps;
  export const emits = contactFieldEmits;

  /* Types */

  export type Props = ContactFieldProps;
  export type Emits = ContactFieldEmits;
}
