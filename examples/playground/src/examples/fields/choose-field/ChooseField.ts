// ChooseField — an advanced select built around Quasar's QSelect.
//
// Server-side fetch, debounced server search, infinite-scroll pagination,
// client-side refinement (equality filters + 'field:asc' sort), variants
// (switchable filter presets), chips, and create-new-option — all as one
// ivue Reactive() class.
//
// Derivation census: 54 derived values are PLAIN getters (0 bytes/instance,
// reactive via leaf tracking). Exactly 1 computed(): `model` — it must be a
// writable ref handle so the SFC can destructure it as a v-model target and
// route writes through the create-option interception; that stable-handle +
// setter requirement is what earns its ~300 bytes.

import type { QSelect } from 'quasar';
import { computed, ref, shallowRef, watch } from 'vue';

import type { QSelectOption, QSelectProps, QSelectSlots } from 'quasar';
import type { ExtractPropTypes, PropType } from 'vue';

import {
  type ExtendSlots,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
  type IFnParameter,
  definePropTypes,
  propsWithDefaults,
  Reactive,
} from '../../../ivue';
import { Static } from '../../../Static';
import { ServerApi } from '../server/ServerApi';
import { Field } from '../Field';

/** Sentinel `value` of the synthetic "Create …" option row. */
export const CREATE_OPTION_VALUE = '__create_option__';

class $ChooseField extends Field.$Class {
  /* Contract — STATIC. The class owns its inputs the way it owns its
     state; ContactField extends them with `super` and re-tunes only
     what differs. Types AND defaults are declared separately on purpose:
     a subclass can re-default without re-typing (propsWithDefaults fuses
     them, wrapping object/array defaults in factories). */

  /** Params Types */
  static override get propsTypes() {
    return definePropTypes({
      ...super.propsTypes,

      /** === QSelect Overrides === */
      multiple: { type: Boolean as PropType<boolean> },
      /** Chips */
      useChips: { type: Boolean as PropType<boolean> },
      roundChips: { type: Boolean as PropType<boolean> },
      /** Input */
      useInput: { type: Boolean as PropType<boolean> },
      inputDebounce: { type: Number as PropType<number> },
      /** Icons */
      dropdownIcon: { type: String as PropType<string> },
      hideDropdownIcon: { type: Boolean as PropType<boolean> },
      /** Options */
      options: { type: Array as PropType<ChooseField.Option[]> },
      optionValue: { type: String as PropType<string> },
      optionsCover: { type: Boolean as PropType<boolean> },
      prependOptions: { type: Array as PropType<ChooseField.Option[]> },
      appendOptions: { type: Array as PropType<ChooseField.Option[]> },
      /** Clearable */
      clearable: { type: Boolean as PropType<boolean> },
      clearIcon: { type: String as PropType<string> },
      /** New Value Mode */
      newValueMode: {
        type: String as PropType<'add' | 'add-unique' | 'toggle' | undefined>,
      },
      /** === QSelect Overrides End === */

      /** === Custom Choose Field Params === */
      /** Client-side filtering — `{ key, value }` equality rows; @see fetchFilters for server side. */
      optionFilters: { type: Array as PropType<ChooseField.OptionFilter[]> },
      /** Client-side sorting in 'field:asc,field2:desc' format; @see fetchSort for server side. */
      optionSort: { type: String as PropType<string> },
      /** Options */
      optionClass: { type: String as PropType<string> },
      /** Label */
      optionLabel: { type: String as PropType<string> },
      optionLabelPriority: { type: Array as PropType<string[]> },
      /** Description */
      optionDescription: { type: String as PropType<string> },
      optionDescriptionPriority: { type: Array as PropType<string[]> },
      /** Chip */
      chipClass: { type: String as PropType<string> },
      /** Icon */
      icon: { type: String as PropType<string> },
      /** Variants */
      variants: { type: Array as PropType<ChooseField.Variant[]> },

      /** The driving runner — a ChooseField subclass CLASS (the base
       *  constructs it) or a pre-built INSTANCE (a wrapping component passes
       *  its own, carrying the wrapper's props and emit — see ContactField).
       *  Ported v1 mechanism. */
      runner: { type: [Function, Object] as PropType<any> },

      /** Fetch */
      fetchPath: { type: String as PropType<string> },
      fetchOnFocus: { type: Boolean as PropType<boolean> },
      fetchScrollThreshold: { type: Number as PropType<number> },
      /** Fetch Filters */
      fetchFilters: { type: String as PropType<string> },
      fetchSort: { type: String as PropType<string> },
      /** Fetch Search */
      fetchSearch: { type: Boolean as PropType<boolean> },
      /** Fetch Pagination */
      fetchPagination: { type: Boolean as PropType<boolean> },
      fetchRowsPerPage: { type: Number as PropType<number> },
      /** Create */
      createPath: { type: String as PropType<string> },
      createLabel: { type: String as PropType<string> },
      createEntityAsOption: { type: Boolean as PropType<boolean> },
    });
  }

  /** Params Defaults */
  static override get propsDefaults(): ExtractPropDefaultTypes<
    typeof $ChooseField.propsTypes
  > {
    return {
      ...super.propsDefaults,

      /** === QSelect Overrides === */
      multiple: false,
      /** Chips */
      useChips: false,
      roundChips: false,
      /** Input */
      useInput: false,
      inputDebounce: 250,
      /** Icons */
      dropdownIcon: 'arrow_drop_down',
      hideDropdownIcon: false,
      /** Options */
      options: [],
      optionValue: '',
      optionsCover: false,
      prependOptions: [], // Extra options ahead of fetched/static options.
      appendOptions: [], // Extra options after fetched/static options.
      /** Clearable */
      clearable: false,
      clearIcon: 'close',
      /** New Value Mode */
      newValueMode: undefined,
      /** === QSelect Overrides End === */

      /** === Custom Choose Field Params === */
      optionFilters: [], // Client-side equality filters, applied after any server fetch.
      optionSort: '', // Client-side sort, 'field:asc,field2:desc' — same grammar as fetchSort.
      /** Options */
      optionClass: '',
      /** Option Label */
      optionLabel: '', // Custom prop to use for the label.
      optionLabelPriority: ['label', 'name', 'value', 'id'], // Fallback chain when optionLabel is not set.
      /** Option Description */
      optionDescription: '', // Custom prop to use for the description.
      optionDescriptionPriority: ['description', 'caption'], // Fallback chain when optionDescription is not set.
      /** Chips */
      chipClass: '',
      /** Icon */
      icon: '',
      /** Variants */
      variants: [],
      /** Runner */
      runner: null,

      /** Fetch */
      fetchPath: '', // List endpoint to fetch options from ('' = purely client-side options).
      fetchOnFocus: true, // Refetch on each focus, for an always-fresh-data feel.
      fetchScrollThreshold: 5, // Items left below the viewport that trigger the next-page fetch.
      /** Fetch Filters */
      fetchFilters: '', // Server-side filter expression; @see optionFilters for client side.
      fetchSort: '', // Server-side sort: 'columnName:asc,columnName2:desc'; @see optionSort for client side.
      /** Fetch Search */
      fetchSearch: false, // Search through the server even without pagination.
      /** Fetch Pagination */
      fetchPagination: false, // Implies server search — client search over a partial page lies.
      fetchRowsPerPage: 20,
      /** Create */
      createPath: '', // POST endpoint enabling the create-new-option affordance.
      createLabel: '',
      createEntityAsOption: true, // Show the create affordance as the first option row while typing.
    };
  }

  /** Re-declared (one line) so the derived `ChooseField.Props` type
   *  carries the params above — see Field.props. */
  static override get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  /** Emits */
  static get emits() {
    return {
      'update:model-value': (value: any) => true,
      remove: (details: IFnParameter<QSelectProps, 'onRemove', 0>) => true,
    };
  }

  constructor(
    public props: ChooseField.Props,
    public emit: ChooseField.Emits,
  ) {
    super();
    this.activeVariantIndex.value = this.defaultActiveVariantIndex;

    if (this.fetchPath) {
      this.seedDisplayedFromModel();
      this.fetchInitialOptions();
    } else {
      // Static options: whenever the options prop is reassigned, re-refine.
      watch(
        () => this.props.options,
        () => this.applyFilter(this.searchTerm.value),
        { immediate: true },
      );
    }

    // Server-side query changed (variant switch or prop change) → refetch.
    watch(
      () => this.serverQuerySignature,
      () => this.onServerQueryChanged(),
    );
    // Client-side refinement changed → re-filter the loaded options.
    watch(
      () => this.clientQuerySignature,
      () => this.applyFilter(this.searchTerm.value),
    );
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ChooseField;
  }

  // --- state ---

  get selectEl() {
    return ref<QSelect | null>(null);
  }
  get displayedOptions() {
    return shallowRef<ChooseField.Option[]>([]);
  }
  get fetchedOptions() {
    return shallowRef<ChooseField.KeyValueRow[]>([]);
  }
  get searchTerm() {
    return ref('');
  }
  get fetchPage() {
    return ref(1);
  }
  get fetchedPages() {
    return shallowRef<Record<number, true>>({});
  }
  get lastFetchedCount() {
    return ref(0);
  }
  get fetching() {
    return ref(false);
  }
  get creating() {
    return ref(false);
  }
  get errorMessage() {
    return ref('');
  }
  get activeVariantIndex() {
    return ref(-1);
  }

  /**
   * v-model proxy — the ONE computed(): a writable ref handle the SFC
   * destructures for `v-model`; its setter intercepts the create sentinel.
   */
  get model() {
    return computed({
      get: () => this.props.modelValue,
      set: (value: any) => this.onModelWrite(value),
    });
  }

  // --- props passthrough (leaf-tracked plain getters) ---

  get multiple() {
    return this.props.multiple;
  }
  get useChips() {
    return this.props.useChips;
  }
  get useInput() {
    return this.props.useInput;
  }
  get inputDebounce() {
    return this.props.inputDebounce;
  }
  get dropdownIcon() {
    return this.props.dropdownIcon;
  }
  get options() {
    return this.props.options;
  }
  get optionValue() {
    return this.props.optionValue;
  }
  get optionsCover() {
    return this.props.optionsCover;
  }
  get prependOptions() {
    return this.props.prependOptions;
  }
  get appendOptions() {
    return this.props.appendOptions;
  }
  get clearable() {
    return this.props.clearable;
  }
  get clearIcon() {
    return this.props.clearIcon;
  }
  get newValueMode() {
    return this.props.newValueMode;
  }
  get optionClass() {
    return this.props.optionClass;
  }
  get icon() {
    return this.props.icon;
  }
  get variants() {
    return this.props.variants;
  }
  get label() {
    return this.props.label;
  }
  get dense() {
    return this.props.dense;
  }
  get disable() {
    return this.props.disable;
  }
  get readonly() {
    return this.props.readonly;
  }
  get outlined() {
    return this.props.outlined;
  }
  get fetchPath() {
    return this.props.fetchPath;
  }
  get fetchScrollThreshold() {
    return this.props.fetchScrollThreshold;
  }
  get fetchRowsPerPage() {
    return this.props.fetchRowsPerPage;
  }
  get createPath() {
    return this.props.createPath;
  }
  get createEntityAsOption() {
    return this.props.createEntityAsOption;
  }

  // --- prop refinements ---

  get hint() {
    return this.readonly ? undefined : this.props.hint;
  }
  get hideDropdownIcon() {
    return this.readonly || this.props.hideDropdownIcon;
  }
  get loading() {
    return this.props.loading || this.fetching.value || this.creating.value;
  }
  get createLabel() {
    return this.props.createLabel || 'Create new';
  }
  get fetchOnFocus() {
    return !!this.fetchPath && this.props.fetchOnFocus;
  }
  get fetchSearch() {
    return !!this.fetchPath && this.props.fetchSearch;
  }
  get fetchPagination() {
    return !!this.fetchPath && this.props.fetchPagination;
  }
  get useFetchSearch() {
    return this.fetchSearch || this.fetchPagination;
  }
  get canCreate() {
    return !!this.createPath;
  }

  // --- chips ---

  get chipBorderRadius() {
    return this.props.roundChips ? '50px' : '5px';
  }
  get chipClass() {
    return [{ 'ivue-chip__singular': !this.multiple }, this.props.chipClass];
  }

  // --- variants ---

  get activeVariant(): ChooseField.Variant | undefined {
    return this.variants.length && this.activeVariantIndex.value > -1
      ? this.variants[this.activeVariantIndex.value]
      : undefined;
  }
  get defaultActiveVariantIndex() {
    const index = this.variants.findIndex((variant) => variant.default);
    return index === -1 && this.variants.length ? 0 : index;
  }

  // Variant-aware query knobs: the active variant overrides the props.
  get fetchFilters() {
    return this.activeVariant?.fetchFilters ?? this.props.fetchFilters;
  }
  get fetchSort() {
    return this.activeVariant?.fetchSort ?? this.props.fetchSort;
  }
  get optionFilters(): ChooseField.OptionFilter[] {
    return this.activeVariant?.optionFilters ?? this.props.optionFilters;
  }
  get optionSort() {
    return this.activeVariant?.optionSort ?? this.props.optionSort;
  }

  isActiveVariant(index: number) {
    return this.activeVariantIndex.value === index;
  }

  setVariant(index: number) {
    this.activeVariantIndex.value = index;
  }

  // --- server query (derived, all plain) ---

  /** Search text lowercased with single quotes doubled (safe in the filter grammar). */
  get escapedSearchTerm() {
    return this.searchTerm.value.toLowerCase().replaceAll("'", "''");
  }

  /** `name ILIKE '%term%' OR id::TEXT ILIKE '%term%'` — the server search expression. */
  get fetchSearchQuery() {
    if (!this.useFetchSearch || this.searchTerm.value === '') return '';
    const term = this.escapedSearchTerm;
    return `name ILIKE '%${term}%' OR id::TEXT ILIKE '%${term}%'`;
  }

  /** fetchFilters and the search expression, each parenthesized, ANDed together. */
  get fetchFiltersQuery() {
    if (this.fetchFilters && this.fetchSearchQuery) {
      return `(${this.fetchFilters}) AND (${this.fetchSearchQuery})`;
    }
    return this.fetchFilters || this.fetchSearchQuery;
  }

  get fetchPathQuery() {
    const queries: string[] = [];
    if (this.fetchPagination) {
      queries.push(`page=${this.fetchPage.value}`);
      queries.push(`rowsPerPage=${this.fetchRowsPerPage}`);
    }
    if (this.fetchFiltersQuery) {
      queries.push(`filters=${encodeURIComponent(this.fetchFiltersQuery)}`);
    }
    if (this.fetchSort) {
      queries.push(`sort=${encodeURIComponent(this.fetchSort)}`);
    }
    return queries.join('&');
  }

  get fetchFullPath() {
    const [path, ...queryParts] = this.fetchPath.split('?');
    const baseQuery = queryParts.length ? `?${queryParts.join('?')}` : '';
    if (!this.fetchPathQuery) return path + baseQuery;
    return path + (baseQuery ? `${baseQuery}&` : '?') + this.fetchPathQuery;
  }

  /** Watch signatures — change means "the query is different now". */
  get serverQuerySignature() {
    return `${this.fetchFilters}|${this.fetchSort}`;
  }
  get clientQuerySignature() {
    return `${JSON.stringify(this.optionFilters)}|${this.optionSort}`;
  }

  // --- options resolution (derived, all plain) ---

  /** Either the fetched result set or the static options prop, plus pre/append. */
  get resolvedOptions(): ChooseField.Option[] {
    return [
      ...this.prependOptions,
      ...(this.fetchPath ? this.fetchedOptions.value : this.options),
      ...this.appendOptions,
    ];
  }

  get hasMoreToFetch() {
    return this.lastFetchedCount.value === this.fetchRowsPerPage;
  }

  // --- fetch ---

  /** Object model values display in the input before the first fetch lands. */
  seedDisplayedFromModel() {
    const value = this.props.modelValue;
    if (typeof value === 'object' && value !== null) {
      this.displayedOptions.value = Array.isArray(value) ? [...value] : [value];
    }
  }

  async fetchInitialOptions() {
    if (this.fetchedOptions.value.length) return;
    this.fetchedOptions.value = await this.fetchOptionsRequest();
    this.applyFilter(this.searchTerm.value);
  }

  async fetchOptionsRequest(): Promise<ChooseField.KeyValueRow[]> {
    this.errorMessage.value = '';
    this.fetching.value = true;
    this.fetchedPages.value = {
      ...this.fetchedPages.value,
      [this.fetchPage.value]: true,
    };
    try {
      const result = await ServerApi.getPaginated<ChooseField.KeyValueRow>(
        this.fetchFullPath,
      );
      this.lastFetchedCount.value = result.data.length;
      this.fetchPage.value++;
      return result.data;
    } catch (error: any) {
      this.errorMessage.value = String(error?.message ?? error);
      return [];
    } finally {
      this.fetching.value = false;
    }
  }

  async refetchOptions() {
    this.resetFetchState();
    this.fetchedOptions.value = await this.fetchOptionsRequest();
    this.applyFilter(this.searchTerm.value);
  }

  resetFetchState() {
    this.fetchPage.value = 1;
    this.fetchedPages.value = {};
    this.fetchedOptions.value = [];
  }

  /** Infinite scroll: fetch the next page when the viewport nears the list end. */
  async onVirtualScroll(details: { to: number; ref: any }) {
    if (!this.fetchPagination) return;

    const lastIndex = this.displayedOptions.value.length - 1;
    const remainingBelowViewport = lastIndex - details.to;

    if (
      !this.fetching.value &&
      this.hasMoreToFetch &&
      remainingBelowViewport < this.fetchScrollThreshold &&
      !(this.fetchPage.value in this.fetchedPages.value)
    ) {
      const nextPage = await this.fetchOptionsRequest();
      if (nextPage.length) {
        this.fetchedOptions.value = [...this.fetchedOptions.value, ...nextPage];
        this.applyFilter(this.searchTerm.value);
      }
      details.ref?.refresh?.();
    }
  }

  async onServerQueryChanged() {
    if (this.fetchPath) await this.refetchOptions();
    this.applyFilter(this.searchTerm.value);
  }

  async onFocus() {
    if (this.fetchOnFocus) await this.refetchOptions();
  }

  // --- search & filter ---

  /** QSelect @input-value — the raw typed text (already debounced by inputDebounce). */
  async onInputValue(value: string) {
    this.searchTerm.value = value;
    if (this.useFetchSearch) await this.refetchOptions();
  }

  /** QSelect @filter — must resolve the options inside the update callback. */
  onFilter(inputValue: string, update: (callbackFn: () => void) => void) {
    update(() => this.applyFilter(inputValue));
  }

  applyFilter(inputValue: string) {
    const refined = this.refineOptions(this.resolvedOptions);
    this.displayedOptions.value = this.useFetchSearch
      ? refined // server already searched
      : refined.filter((option) => this.matchesSearch(inputValue, option));
    this.prependCreateOptionRow();
  }

  /** Client-side refinement: `{ key, value }` equality filters, then 'field:asc' sort. */
  refineOptions(options: ChooseField.Option[]): ChooseField.Option[] {
    let refined = options;
    if (this.optionFilters.length) {
      refined = refined.filter((option) =>
        this.optionFilters.every(
          (filter) => (option as ChooseField.KeyValueRow)?.[filter.key] === filter.value,
        ),
      );
    }
    if (this.optionSort) {
      refined = [...refined].sort((first, second) =>
        this.compareBySort(first, second),
      );
    }
    return refined;
  }

  compareBySort(first: ChooseField.Option, second: ChooseField.Option) {
    for (const sortPart of this.optionSort.split(',')) {
      const [field, direction] = sortPart.split(':');
      const firstValue = (first as ChooseField.KeyValueRow)?.[field.trim()];
      const secondValue = (second as ChooseField.KeyValueRow)?.[field.trim()];
      if (firstValue === secondValue) continue;
      const ascending = (direction?.trim() || 'asc') === 'asc';
      return (firstValue > secondValue ? 1 : -1) * (ascending ? 1 : -1);
    }
    return 0;
  }

  matchesSearch(inputValue: string, option: ChooseField.Option) {
    const needle = inputValue.toLowerCase().trim();
    if (needle === '') return true;
    if (typeof option === 'string' || typeof option === 'number') {
      return String(option).toLowerCase().includes(needle);
    }
    // Search the first layer of the option's own values.
    return Object.values(option as ChooseField.KeyValueRow).some((cellValue) =>
      String(cellValue ?? '')
        .toLowerCase()
        .includes(needle),
    );
  }

  // --- option label & description resolution ---

  optionLabelOf(option: ChooseField.Option): string {
    if (typeof option === 'string' || typeof option === 'number') {
      return String(option);
    }
    return String(this.firstPresentValue(option, this.labelKeys) ?? '');
  }
  optionDescriptionOf(option: ChooseField.Option): string {
    if (typeof option !== 'object' || option === null) return '';
    return String(this.firstPresentValue(option, this.descriptionKeys) ?? '');
  }
  optionIconOf(option: ChooseField.Option): string {
    return typeof option === 'object' && option !== null
      ? ((option as ChooseField.KeyValueRow).icon ?? '')
      : '';
  }

  get labelKeys() {
    return this.props.optionLabel
      ? [this.props.optionLabel]
      : this.props.optionLabelPriority;
  }
  get descriptionKeys() {
    return this.props.optionDescription
      ? [this.props.optionDescription]
      : this.props.optionDescriptionPriority;
  }

  firstPresentValue(row: ChooseField.KeyValueRow, keys: string[]) {
    for (const key of keys) {
      const candidate = row?.[key];
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        return candidate;
      }
    }
    return undefined;
  }

  /** QSelect option-value fn: the optionValue prop's key, else id, else the row itself. */
  optionValueOf(option: ChooseField.Option) {
    if (typeof option !== 'object' || option === null) return option;
    const row = option as ChooseField.KeyValueRow;
    if (this.optionValue) return row[this.optionValue];
    return row.id ?? row.value ?? row;
  }

  // --- create new option ---

  /** Prepend the synthetic "Create …" row while the user has typed a new term. */
  prependCreateOptionRow() {
    if (!this.canCreate || !this.createEntityAsOption) return;
    if (!this.searchTerm.value.trim()) return;
    // An option with this exact label already exists (loaded or selected):
    // offer nothing to create — selecting it is the only correct action.
    if (this.findOptionByLabel(this.searchTerm.value)) return;
    const [firstOption] = this.displayedOptions.value;
    if ((firstOption as ChooseField.KeyValueRow)?.value === CREATE_OPTION_VALUE) return;
    const term = this.searchTerm.value.trim();
    const text = `${this.createLabel || 'Create new'} '${term}'`;
    this.displayedOptions.value = [
      {
        // label under BOTH the default key and the active optionLabel key,
        // so custom option-label props still render the affordance text
        label: text,
        ...(this.props.optionLabel ? { [this.props.optionLabel]: text } : {}),
        createTerm: term,
        icon: 'add',
        value: CREATE_OPTION_VALUE,
      },
      ...this.displayedOptions.value,
    ];
  }

  isCreateOptionRow(option: ChooseField.Option) {
    return (option as ChooseField.KeyValueRow)?.value === CREATE_OPTION_VALUE;
  }

  /** POST the typed term as a new entity, add it to the options, select it. */
  async createOption() {
    const name = this.searchTerm.value.trim();
    if (!this.canCreate || !name) return;
    // Duplicate guard: an option with the same label (case-insensitive)
    // already loaded or already selected gets SELECTED, never re-created.
    const existing = this.findOptionByLabel(name);
    if (existing) {
      this.searchTerm.value = '';
      this.selectEl.value?.updateInputValue('', true);
      this.applyFilter('');
      if (!this.isSelectedOption(existing)) this.selectCreated(existing);
      return;
    }
    this.creating.value = true;
    try {
      const created = await ServerApi.postCustom(this.createPath, { name });
      this.fetchedOptions.value = [created, ...this.fetchedOptions.value];
      this.searchTerm.value = '';
      this.selectEl.value?.updateInputValue('', true);
      this.applyFilter('');
      this.selectCreated(created);
    } catch (error: any) {
      this.errorMessage.value = String(error?.message ?? error);
    } finally {
      this.creating.value = false;
    }
  }

  findOptionByLabel(label: string): ChooseField.KeyValueRow | undefined {
    const wanted = label.trim().toLowerCase();
    const pools: any[] = [
      ...this.fetchedOptions.value,
      ...(Array.isArray(this.props.modelValue)
        ? this.props.modelValue
        : this.props.modelValue
          ? [this.props.modelValue]
          : []),
    ];
    return pools.find(
      (option) =>
        String(this.optionLabelOf(option)).trim().toLowerCase() === wanted,
    );
  }

  isSelectedOption(option: ChooseField.KeyValueRow): boolean {
    const selected = Array.isArray(this.props.modelValue)
      ? this.props.modelValue
      : this.props.modelValue
        ? [this.props.modelValue]
        : [];
    return selected.some(
      (entry: any) =>
        this.optionValueOf(entry) === this.optionValueOf(option) &&
        this.optionLabelOf(entry) === this.optionLabelOf(option),
    );
  }

  selectCreated(created: ChooseField.KeyValueRow) {
    if (this.multiple) {
      const current = Array.isArray(this.props.modelValue)
        ? this.props.modelValue
        : [];
      this.updateModelValue([...current, created]);
    } else {
      this.updateModelValue(created);
      this.selectEl.value?.hidePopup();
    }
  }

  // --- model value ---

  /** All writes route here: intercept the create sentinel, pass the rest through. */
  onModelWrite(value: any) {
    const isArrayValue = Array.isArray(value);
    const lastAdded = isArrayValue ? value[value.length - 1] : value;
    if ([lastAdded, (lastAdded as ChooseField.KeyValueRow)?.value].includes(CREATE_OPTION_VALUE)) {
      this.createOption();
      return;
    }
    this.updateModelValue(value);
  }

  updateModelValue(value: any) {
    this.emit('update:model-value', value);
  }

  onRemove(details: any) {
    this.emit('remove', details);
  }
}


export namespace ChooseField {
  /* Identity */

  export const $Class = Static($ChooseField); // anchor — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /* Types — DERIVED from the class's statics, never hand-duplicated */

  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Emits = ExtractEmitTypes<typeof $Class.emits>;
  /** Every QSelect slot, plus a 'before--'/'after--' pair around each. */
  export type Slots = ExtendSlots<QSelectSlots>;

  export type KeyValueRow = Record<string, any>;
  export type Option = string | number | QSelectOption | KeyValueRow;

  /**
   * Client-side option filter: a `{ key, value }` equality predicate applied
   * to each loaded option row. Deliberately tiny — the server-side
   * `fetchFilters` string handles anything richer.
   */
  export interface OptionFilter {
    key: string;
    value: any;
  }

  /** A named preset of server + client filtering the user can switch between. */
  export interface Variant {
    label: string;
    default?: true;
    icon?: string;
    fetchFilters?: string;
    fetchSort?: string;
    /** Client filters & sort are applied after server-side fetch filters & sort. */
    optionFilters?: OptionFilter[];
    optionSort?: string;
  }
}
