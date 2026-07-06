/**
 * ARM A — the idiomatic "composable per entity" model.
 *
 * Ported unchanged from `demo/grid/composableCell.ts`. A factory that, for
 * EVERY cell, eagerly creates a `ref` for the raw value and an eager
 * `computed()` for each derived value (display, isNumber, cssClass and the
 * hot numericValue). This is the textbook Vue 3 way to give an entity
 * fine-grained reactivity — and every one of the cells pays the full
 * per-instance cost up front, whether or not it is ever rendered.
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { cssOf, displayOf, isNumberOf, numericOf } from './cell-logic';

export interface ComposableCell {
  readonly row: number;
  readonly col: number;
  readonly raw: Ref<string>;
  readonly numericValue: ComputedRef<number>;
  readonly isNumber: ComputedRef<boolean>;
  readonly display: ComputedRef<string>;
  readonly cssClass: ComputedRef<string>;
  /** Read every derived value once (used only to force full materialization). */
  touch(): void;
}

export function createComposableCell(
  row: number,
  col: number,
  initial: string,
): ComposableCell {
  const raw = ref(initial);

  // Eager: all four Computeds are allocated the moment the cell is created.
  const numericValue = computed(() => numericOf(raw.value));
  const isNumber = computed(() => isNumberOf(raw.value));
  const display = computed(() =>
    displayOf(raw.value, isNumber.value, numericValue.value),
  );
  const cssClass = computed(() => cssOf(isNumber.value, numericValue.value));

  return {
    row,
    col,
    raw,
    numericValue,
    isNumber,
    display,
    cssClass,
    touch() {
      void this.display.value;
      void this.isNumber.value;
      void this.cssClass.value;
      void this.numericValue.value;
    },
  };
}
