// field-kit.ts — the minimal base-prop surface every field example shares.
//
// Each field spreads `baseFieldProps` under its own params so the common
// QField passthrough (model, label, hint, density, read/disable states,
// loading, outlined styling) is declared once.

import type { PropType } from 'vue';

export const baseFieldProps = {
  modelValue: { type: null as unknown as PropType<any>, default: null },
  label: { type: String as PropType<string>, default: '' },
  hint: { type: String as PropType<string>, default: '' },
  dense: { type: Boolean as PropType<boolean>, default: false },
  disable: { type: Boolean as PropType<boolean>, default: false },
  readonly: { type: Boolean as PropType<boolean>, default: false },
  loading: { type: Boolean as PropType<boolean>, default: false },
  outlined: { type: Boolean as PropType<boolean>, default: true },
};
