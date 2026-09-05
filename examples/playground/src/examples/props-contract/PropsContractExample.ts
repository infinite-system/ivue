// PropsContractExample.ts — the route's ONE model. Everything it shows is
// READ off the two classes' statics: the knobs panel is built from
// Badge's prop types and defaults, the ledger from the difference between
// Badge's contract and IconBadge's. No list of props is written here.
import { ref } from 'vue';
import { Reactive } from '../../ivue';
import { Badge } from './Badge';
import { IconBadge } from './IconBadge';

class $PropsContractExample {
  // MUTABLE STATE — the knob values, seeded from the class's own defaults
  get values() {
    return ref<PropsContractExample.Values>({
      label: 'runtime',
      ...Badge.Class.propsDefaults,
    });
  }

  // DERIVED — the knobs panel, read off the contract
  get controls(): PropsContractExample.Control[] {
    const types = Badge.Class.propsTypes;
    const defaults: Partial<Record<PropsContractExample.PropName, unknown>> = Badge.Class.propsDefaults;
    const choices: Partial<Record<PropsContractExample.PropName, readonly PropsContractExample.Choice[]>> = Badge.Class.propsChoices;
    return (Object.keys(types) as PropsContractExample.PropName[]).map((name) => {
      const declaration = types[name] as PropsContractExample.Declaration;
      return {
        name,
        kind: this.kindOf(declaration.type),
        required: declaration.required === true,
        defaultValue: defaults[name],
        validator: declaration.validator,
        choices: choices[name],
      };
    });
  }

  // DERIVED — the inheritance ledger, read off both contracts
  get baseNames() {
    return Object.keys(Badge.Class.propsTypes);
  }

  get variantNames() {
    return Object.keys(IconBadge.Class.propsTypes);
  }

  get addedNames() {
    return this.variantNames.filter((name) => !this.baseNames.includes(name));
  }

  get retunedDefaults() {
    const base: Record<string, unknown> = Badge.Class.propsDefaults;
    const variant: Record<string, unknown> = IconBadge.Class.propsDefaults;
    return this.baseNames
      .filter((name) => name in variant && variant[name] !== base[name])
      .map((name) => `${name}: ${String(base[name])} → ${String(variant[name])}`);
  }

  get inheritedLabel() {
    return `${this.baseNames.length} inherited`;
  }

  get addedLabel() {
    return `${this.addedNames.length} added (${this.addedNames.join(', ')})`;
  }

  get retunedLabel() {
    return this.retunedDefaults.join(', ');
  }

  /** The validator is a VALUE — the panel calls it the way Vue would. */
  get invalidNames() {
    return this.controls
      .filter((control) => control.validator && !control.validator(this.values.value[control.name]))
      .map((control) => control.name);
  }

  get hasInvalid() {
    return this.invalidNames.length > 0;
  }

  get validityLabel() {
    return this.hasInvalid ? `validator rejects: ${this.invalidNames.join(', ')}` : 'every value passes its validator';
  }

  // PER-CONTROL — named template conditions and labels
  hasChoices(control: PropsContractExample.Control) {
    return control.choices !== undefined;
  }

  isChosen(control: PropsContractExample.Control, choice: PropsContractExample.Choice) {
    return this.values.value[control.name] === choice;
  }

  isNumberControl(control: PropsContractExample.Control) {
    return control.kind === 'number';
  }

  isBooleanControl(control: PropsContractExample.Control) {
    return control.kind === 'boolean';
  }

  isTextControl(control: PropsContractExample.Control) {
    return control.kind === 'text';
  }

  isInvalid(control: PropsContractExample.Control) {
    return this.invalidNames.includes(control.name);
  }

  defaultLabel(control: PropsContractExample.Control) {
    return control.required ? 'required, no default' : `default: ${JSON.stringify(control.defaultValue)}`;
  }

  currentLabel(control: PropsContractExample.Control) {
    return `current: ${JSON.stringify(this.values.value[control.name])}`;
  }

  numberValue(control: PropsContractExample.Control) {
    return Number(this.values.value[control.name]);
  }

  booleanValue(control: PropsContractExample.Control) {
    return this.values.value[control.name] === true;
  }

  textValue(control: PropsContractExample.Control) {
    return String(this.values.value[control.name] ?? '');
  }

  // ACTIONS
  choose(control: PropsContractExample.Control, choice: PropsContractExample.Choice) {
    this.write(control, choice);
  }

  setNumber(control: PropsContractExample.Control, event: Event) {
    this.write(control, Number((event.target as HTMLInputElement).value));
  }

  setBoolean(control: PropsContractExample.Control, event: Event) {
    this.write(control, (event.target as HTMLInputElement).checked);
  }

  setText(control: PropsContractExample.Control, event: Event) {
    this.write(control, (event.target as HTMLInputElement).value);
  }

  /** One write path for every knob — the value's type is the control's, not the record's. */
  write(control: PropsContractExample.Control, value: unknown) {
    (this.values.value as Record<string, unknown>)[control.name] = value;
  }

  reset() {
    this.values.value = { label: 'runtime', ...Badge.Class.propsDefaults };
  }

  kindOf(type: unknown): PropsContractExample.Kind {
    if (type === Number) return 'number';
    if (type === Boolean) return 'boolean';
    return 'text';
  }
}

export namespace PropsContractExample {
  export const $Class = $PropsContractExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export type PropName = keyof typeof Badge.$Class.propsTypes;
  export type Values = Record<PropName, unknown> & { label: string };
  export type Kind = 'number' | 'boolean' | 'text';
  export type Choice = string | number;
  export interface Declaration {
    type: unknown;
    required?: boolean;
    validator?: (value: unknown) => boolean;
  }
  export interface Control {
    name: PropName;
    kind: Kind;
    required: boolean;
    defaultValue: unknown;
    validator?: (value: unknown) => boolean;
    choices?: readonly Choice[];
  }
}
