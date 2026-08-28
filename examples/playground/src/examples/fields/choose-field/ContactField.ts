import { Reactive } from '../../../ivue';
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
 * ContactField's model — ChooseField preconfigured for the '/contact'
 * endpoint, with avatar-decorated options and chips in two display
 * modes (full / compact). The component WRAPS ChooseField.vue rather
 * than subclassing the class: its whole job is passing the surface
 * through and decorating the option/chip slots, so the model is the
 * named vocabulary of that decoration — every size, class and
 * condition the template needs, none of it inline.
 */
class $ContactField {
  constructor(
    public props: ContactFieldProps,
    public emit: ContactFieldEmits
  ) {}

  /* Props */

  get compact() {
    return this.props.compact;
  }

  /* Derived — the wrapper's vocabulary, named */

  /** Everything except our own `compact` passes straight into ChooseField. */
  get chooseProps() {
    const { compact, modelValue, ...passthrough } = this.props;
    return passthrough;
  }

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

  /* Methods — emit forwarding from the wrapped ChooseField */

  forwardModelValue(value: any) {
    this.emit('update:model-value', value);
  }

  forwardRemove(details: { index: number; value: any }) {
    this.emit('remove', details);
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
