import { SortOption, query } from '@chronicstone/array-query';
import _cloneDeep from 'lodash/cloneDeep';
import _get from 'lodash/get';
import _isEqual from 'lodash/isEqual';
import { QSelect, QSelectOption, QSelectProps, useQuasar } from 'quasar';
import { Component, nextTick, watch } from 'vue';

import BlFormDialog from '@/components/dialog/BlFormDialog.vue';
import { useBlFieldNew } from '@/composables/useBlField';
import BlacklineApi from '@/services/blackline_api.service';
import { FieldsTemplates as globalFieldsTemplates } from '@/services/field-templates';
import { useProjectStore } from '@/stores/project.store';
import { IKeyValue } from '@/types/core';
import { IField } from '@/types/field';
import { asyncImport } from '@/utils/dynamicImport';
import { formatUpdatePayload } from '@/utils/entity';
import { notifyErrorMessage, parseErrorMessage } from '@/utils/error';
import { IFnParameter, Use, iref, iuse } from 'ivue';
import {
  formatPgArrayOfValues,
  formatPgValue,
  snakeToClean,
} from '@/utils/string';

import {
  BlChooseContactFieldEmits,
  BlChooseContactFieldProps,
} from './BlChooseContactFieldProps';
import type {
  BlChooseFieldVariant,
  IChooseFieldEmits,
  IChooseFieldProps,
} from './BlChooseFieldProps';
import { formatFieldsTemplate } from '@/utils/fields';

export type QSelectComponent = InstanceType<typeof QSelect> | undefined;

export type FullQSelectOption = QSelectOption | IKeyValue | string | number;

/**
 * Advanced select component wrapped around QSelect component of Quasar.
 * Supports fetching data from the server side, server side pagination and search.
 */
export default class BlChooseFieldClass {
  $q = useQuasar();

  projectStore = useProjectStore();

  input = iref<QSelectComponent | undefined>();

  field: Use<typeof useBlFieldNew>;

  optionComponent = iref<Component | false>(false);

  constructor(public props: IChooseFieldProps, public emit: IChooseFieldEmits) {
    this.field = iuse(useBlFieldNew, props);
  }

  /* === IVUE INITIALIZER === */

  async init() {
    if (this.props.optionComponent) {
      this.optionComponent = await asyncImport(this.props.optionComponent, undefined, true);
    }

    this.setDefaultActiveVariant();

    if (this.fetchPath) {
      if (typeof this.modelValue === 'object' && this.modelValue !== null) {
        /**
         * This makes sure the values display property inside the input
         * before the items are fetched into the options.
         */
        this.filteredOptions = Array.isArray(this.modelValue)
          ? this.modelValue
          : [this.modelValue];
      }
      /** This is for options that are fetched via data. */
      await this.fetchInitialItems();
    } else {
      /** If options are reassigned, they should update filtered options. */
      watch(
        () => this.options,
        () => {
          this.filteredOptions = this.resolvedOptions;
          this.filter(this.searchText);
        },
        { immediate: true }
      );
    }

    watch(
      () => [
        [this.fetchFilters, this.fetchSort], // Track server side fetch filters/sort change
        [this.optionFilters, this.optionSort], // Track client side options filters/sort change
      ],
      async (
        [newFetchFilters, newOptionFilters],
        [oldFetchFilters, oldOptionFilters]
      ) => {
        const differentFetchFilters = !_isEqual(
          newFetchFilters,
          oldFetchFilters
        );

        const differentOptionFilters = !_isEqual(
          newOptionFilters,
          oldOptionFilters
        );

        if (differentFetchFilters) {
          await this.refetchEntitiesRequest();
        }

        if (differentFetchFilters || differentOptionFilters) {
          this.filter(this.searchText);
        }
      }
    );
  }

  get modelValue() {
    return this.props.modelValue;
  }

  /* === OPTIONS === */

  _filteredOptions = iref<FullQSelectOption[]>([]);

  /** Resulting options that go into QSelect. */
  get filteredOptions() {
    return this._filteredOptions;
  }

  set filteredOptions(value: any[]) {
    this._filteredOptions = value.map((v) => {
      if (this.optionValue && typeof v === 'object' && v !== null) {
        v.__value_prop__ = this.optionValue;
      }
      return v;
    });
  }

  /** Resolved options: either request data result set or manually set options prop. */
  get resolvedOptions() {
    return [
      ...this.prependOptions,
      ...(this.fetchPath ? this.fetchedData : this.options),
      ...this.appendOptions,
    ];
  }

  get options() {
    return this.props.options;
  }

  get appendOptions() {
    return this.props.appendOptions;
  }

  get prependOptions() {
    return this.props.prependOptions;
  }

  get optionValue() {
    return this.props.optionValue;
  }

  get optionClass() {
    return this.props.optionClass;
  }

  get optionFilters() {
    return this.activeVariant
      ? this.activeVariant.optionFilters
      : this.props.optionFilters;
  }

  get optionSort() {
    return this.activeVariant
      ? this.activeVariant.optionSort
      : this.props.optionSort;
  }

  get optionsSelectedClass() {
    return `bg-grey-3 text-${this.color}`;
  }

  get optionsCover() {
    return this.props.optionsCover;
  }

  canViewOption(scope: any) {
    return scope.opt?.value !== '__create_entity__';
  }

  get multiple() {
    return this.props.multiple;
  }

  get required() {
    return this.props.required;
  }

  get newValueMode() {
    return this.props.newValueMode;
  }

  /* === CHIPS === */

  get useChips() {
    return this.props.useChips;
  }

  get chipBorderRadius() {
    return this.props.roundChips ? '50px' : '5px';
  }

  get chipClass() {
    return [
      {
        'q-chip__singular': !this.multiple,
        'q-chip__draggable': this.draggable,
      },
      this.props.chipClass,
    ];
  }

  /* === INPUT === */

  get useInput() {
    return this.props.useInput;
  }

  get inputPaddingTop() {
    return String(this.props?.label ?? '').trim() ? '16px' : '3px';
  }

  get inputDebounce() {
    return this.props.inputDebounce;
  }

  get highlightChanges() {
    return this.props.highlightChanges && this.field.changeMade;
  }

  get class() {
    return [
      `col-${this.props.col}`,
      {
        'highlight-change': this.highlightChanges,
      },
      this.props.fieldsClass,
      this.props.class,
    ];
  }

  get style() {
    return this.props.style;
  }

  get placeholder() {
    return this.props.placeholder;
  }

  get icon() {
    return this.props.icon;
  }

  get hidden() {
    return this.props.hidden;
  }

  get readonly() {
    return this.props.readonly;
  }

  get disable() {
    return this.props.disable;
  }

  get hint() {
    return this.readonly ? undefined : this.props.hint;
  }

  get color() {
    return this.props.color;
  }

  get outlined() {
    return this.props.outlined;
  }

  get filled() {
    return this.props.filled && !this.readonly;
  }

  get label() {
    return this.props.label;
  }

  get dense() {
    return this.props.dense;
  }

  get dropdownIcon() {
    return this.props.dropdownIcon;
  }

  get hideDropdownIcon() {
    return this.readonly || this.props.hideDropdownIcon;
  }

  get labelColor() {
    return this.readonly ? 'grey-7' : this.color;
  }

  /* === CLEARABLE === */

  get clearable() {
    return this.props.clearable;
  }

  get clearIcon() {
    return this.props.clearIcon;
  }

  /* === PROJECT === */

  get project() {
    return this.projectStore.project;
  }

  get projectId() {
    return this.project?.id || this.props.projectId;
  }

  get projectEntityTemplates() {
    return this.project?.entity_templates;
  }

  /* === VARIANTS === */

  activeVariantIndex = iref(-1);

  activeVariantButtonColor(index: number) {
    return this.activeVariantIndex === index ? 'primary' : 'white';
  }

  activeVariantButtonTextColor(index: number) {
    return this.activeVariantIndex === index ? 'primary' : 'grey-10';
  }

  activeVariantButtonClass(index: number) {
    return 'text-condensed';
  }

  activeVariantButtonStyle(index: number) {
    return {
      backgroundColor:
        this.activeVariantIndex === index ? 'rgb(238, 238, 238)' : 'white',
      fontWeight: this.activeVariantIndex === index ? '500' : '400',
    };
  }

  get variants() {
    return this.props.variants;
  }

  get activeVariant() {
    return this.variants.length && this.activeVariantIndex > -1
      ? this.variants[this.activeVariantIndex]
      : undefined;
  }

  get defaultActiveVariantIndex() {
    const index = this.variants?.findIndex((variant) => variant.default) ?? -1;
    return index === -1 ? 0 : index;
  }

  setDefaultActiveVariant() {
    this.activeVariantIndex = this.defaultActiveVariantIndex;
  }

  setVariantByIndex(index: number) {
    this.activeVariantIndex = index;
  }

  setVariant(label: string) {
    this.activeVariantIndex = this.variants.findIndex(
      (variant) => variant.label === label
    );
  }

  /* === CRUD === */

  protected formatPath(path: string) {
    return path.replaceAll(':project_id', this.projectId);
  }

  protected resolveFieldsTemplate(
    fieldsTemplate: IField[],
    entityName: string | boolean
  ): IField[] {
    return fieldsTemplate?.length
      ? fieldsTemplate
      : this.projectEntityTemplates?.[entityName as string] ??
          globalFieldsTemplates[entityName as string] ??
          [];
  }

  get fetchSearch() {
    return this.fetchPath && this.props.fetchSearch;
  }

  get fetchPagination() {
    return !!(this.fetchPath && this.props.fetchPagination);
  }

  get useFetchSearch() {
    return this.fetchSearch || this.fetchPagination;
  }

  get fetchRowsPerPage() {
    return this.props.fetchRowsPerPage;
  }

  get fetchSort() {
    return this.activeVariant
      ? this.activeVariant.fetchSort
      : this.props.fetchSort;
  }

  get fetchFilters() {
    return this.activeVariant
      ? this.activeVariant.fetchFilters
      : this.props.fetchFilters;
  }

  /* === FETCH === */

  get fetchPath() {
    return this.formatPath(this.props.fetchPath);
  }

  get fetchEntity() {
    return this.props.fetchEntity || '';
  }

  get fetchFieldsTemplate() {
    return this.resolveFieldsTemplate(
      this.props.fetchFieldsTemplate,
      this.fetchEntity
    );
  }

  get fetchScrollThreshold() {
    return this.props.fetchScrollThreshold;
  }

  get fetchPathQuery(): string {
    const queries: string[] = [];

    if (this.fetchPagination) {
      queries.push(`page=${this.fetchPage}`);
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
    const pathParts = this.fetchPath.split('?');
    const path = pathParts.shift();

    const query = pathParts.join('?');
    const baseQuery = query ? `?${query}` : '';

    let fullQuery = baseQuery;
    if (this.fetchPathQuery)
      fullQuery = (baseQuery || '?') + this.fetchPathQuery;

    return path + fullQuery;
  }

  get fetchOnFocus() {
    return this.fetchPath && this.props.fetchOnFocus;
  }

  fetchedInitialItems = iref(false);

  fetchLoading = iref(false);

  fetchPage = iref(1);

  fetchedRowsCount = iref(0);

  fetchedPages = iref<Record<string, any>>({});

  fetchedData = iref<IKeyValue[]>([]);

  async fetchInitialItems() {
    if (
      !this.fetchedInitialItems &&
      this.fetchPath &&
      !this.fetchedData.length
    ) {
      this.fetchedData = await this.fetchEntitiesRequest();
      this.filter(this.searchText); /** This is important to reload the list. */
      this.fetchedRowsCount = this.fetchedData?.length ?? 0;
      this.fetchedInitialItems = true;
    }
  }

  async fetchEntitiesRequest() {
    this.errorMessage = '';

    this.fetchLoading = true;
    this.fetchedPages[this.fetchPage] = true;

    let data = [];

    try {
      data = await BlacklineApi.getCustom(this.fetchFullPath);

      this.fetchedRowsCount = data.length;
      this.fetchPage++;
    } catch (err) {
      this.errorMessage = parseErrorMessage(err);
      notifyErrorMessage(err);
    } finally {
      this.fetchLoading = false;
    }

    return data;
  }

  async fetchNextPage({ to, ref }: { to: any; ref: any }) {
    if (!this.fetchPagination) return;

    const lastIndex = this.filteredOptions.length - 1;
    const scrollThreshold = lastIndex - to;

    if (
      this.fetchLoading !== true &&
      this.fetchedRowsCount === this.fetchRowsPerPage &&
      scrollThreshold < this.fetchScrollThreshold &&
      !(this.fetchPage in this.fetchedPages)
    ) {
      const nextPageData = await this.fetchEntitiesRequest();
      if (nextPageData.length) {
        this.fetchedData.push(...nextPageData);
      }
      this.filter(this.searchText); /** This is important to reload the list. */
      this.fetchedRowsCount = nextPageData.length;

      nextTick(() => ref.refresh());
    }
  }

  async refetchEntitiesRequest() {
    this.fetchResetState();
    const fetchedData = await this.fetchEntitiesRequest();
    if (!_isEqual(fetchedData, this.fetchedData)) {
      this.fetchedData = fetchedData;
      this.filter(this.searchText); /** This is important to reload the list. */
    }
  }

  fetchResetState() {
    this.fetchPage = 1;
    this.fetchedPages = {};
    this.fetchedData = [];
  }

  formatFetchSearchQuery(value: string) {
    return value.toLowerCase()?.replaceAll("'", "''"); // lowercase and escape single quotes by doubling them (valid for Postgres)
  }

  formatFetchSearchProp(prop: string) {
    let searchProp = prop ?? '';
    const propParts = searchProp.split('.');
    if (propParts.length > 2) {
      const lastPart = propParts.pop();
      searchProp = '"' + propParts.join(':') + '".' + lastPart;
    }
    return searchProp;
  }

  get fetchSearchQuery(): string | '' {
    if (this.useFetchSearch && this.searchText !== '') {
      let fetchSearchQuery = '';

      const formattedSearchQuery = this.formatFetchSearchQuery(this.searchText);

      if (this.fetchFieldsTemplate?.length) {
        /**
         * Generate search query based on @see {BlChooseFieldClass.fetchFieldsTemplate}.
         * Use { fetchFieldsTemplate: [{ prop: 'name', searchable: true }, { prop: 'description', searchable: true }] }
         * to have search on name and description, or other fields enabled for server side search.
         */
        this.fetchFieldsTemplate.forEach((field) => {
          if (field.searchable) {
            const formattedSearchProp = this.formatFetchSearchProp(
              field.prop ?? ''
            );

            fetchSearchQuery +=
              (fetchSearchQuery ? ' OR ' : '') +
              `${formattedSearchProp}::TEXT ILIKE '%${formattedSearchQuery}%'`;
          }
        });
      } else {
        /**
         * Only the id key is certain to exist for both lookup tables and other models.
         * Use { fetchFieldsTemplate: [{ prop: 'name', searchable: true }, { prop: 'description', searchable: true }] }
         * to have search on name and description, or other fields enabled for server side search.
         */
        fetchSearchQuery = `id::TEXT ILIKE '%${formattedSearchQuery}%'`;
      }

      return fetchSearchQuery;
    }

    return '';
  }

  get fetchFiltersQuery() {
    switch (true) {
      case !!(
        this.fetchFilters &&
        this.useFetchSearch &&
        this.fetchSearchQuery
      ): // Filters + Search Combined
        return `(${this.fetchFilters}) AND (${this.fetchSearchQuery})`;
      case !!(
        this.fetchFilters && !(this.useFetchSearch && this.fetchSearchQuery)
      ): // Filters Only
        return this.fetchFilters;
      case !!(this.useFetchSearch && this.fetchSearchQuery):
        // Search Only
        return this.fetchSearchQuery;
    }
    return '';
  }

  fetchFilterOptions(inputValue: string) {
    /** Note: this.clientBaseFilter() runs for both fetchFilterOptions & clientFilterOptions. */
    this.filteredOptions = this.clientBaseFilter(
      this.resolvedOptions,
      inputValue
    );
  }

  async onVirtualScroll(details: { to: any; ref: any }) {
    await this.fetchNextPage(details);
  }

  /* === SEARCH === */

  searchText = iref('');

  async search(value: string) {
    this.searchText = value;

    if (this.fetchPath && this.useFetchSearch) {
      this.refetchEntitiesRequest();
    }
  }

  async onFocus(event: any) {
    if (this.fetchOnFocus) {
      await this.refetchEntitiesRequest();
    }
  }

  async onInputValue(value: string) {
    await this.search(value);
  }

  /* === FILTER === */

  sanitizeInputValue(inputValue: string) {
    return inputValue.toLowerCase().trim();
  }

  onFilter(
    inputValue: string,
    update: (callbackFn: () => void, afterFn?: (ref: QSelect) => void) => void
  ) {
    /** Make update function re-usable. */

    update(() => this.filter(inputValue));
  }

  filter(inputValue: string) {
    if (this.useFetchSearch) {
      this.fetchFilterOptions(inputValue);
    } else {
      this.clientFilterOptions(inputValue);
    }

    this.addCreateEntityAsOption();
  }

  /** CLIENT FILTER */
  clientFilterOptions(inputValue: string) {
    /**
     * Standard options require array filtering.
     */
    /** Note: this.clientBaseFilter runs for both fetchFilterOptions & clientFilterOptions. */
    this.filteredOptions = this.clientBaseFilter(
      this.resolvedOptions,
      inputValue
    ).filter((option) => this.clientSearchFilter(inputValue, option));
  }

  formatOptionSort(sort: string | undefined) {
    if (!sort) return [];

    const sortList = sort.split(',');
    const sortResult = sortList.map((sort) => {
      const [field, order] = sort.split(':');
      return {
        key: field.trim(),
        dir: order?.trim() || 'asc',
      };
    });

    return sortResult as SortOption<string>[];
  }

  /**
   * Filter the resulting options after server fetching data based options
   * or filter the options provided by the 'options' prop.
   *
   * Note: this function runs for both server and client filters.
   * @see {clientFilterOptions}
   * @see {fetchFilterOptions}
   */
  clientBaseFilter(options: any[], inputValue: string) {
    if (this.optionFilters?.length || this.optionSort) {
      const formattedSort = this.formatOptionSort(this.optionSort);
      return query(options, {
        filter: this.optionFilters,
        sort: formattedSort,
      }).rows;
    } else {
      return options;
    }
  }

  clientSearchFilter(inputValue: string, option: FullQSelectOption) {
    const needle = this.sanitizeInputValue(inputValue);
    /** If search needle is empty, return all results. */
    if (needle === '') return true;

    if (typeof option === 'string' || typeof option === 'number') {
      /** If option is a regular value such as string or number. */
      return String(option).toLowerCase().indexOf(needle) > -1;
    } else {
      /**
       * If we have fields template defined related to the fetchEntity,
       * we search through the searchable fields.
       */
      if (this.fetchFieldsTemplate.length) {
        for (let i = 0; i < this.fetchFieldsTemplate.length; i++) {
          const field = this.fetchFieldsTemplate[i];
          if (field.searchable) {
            if (
              String(_get(option, (field?.prop as string) ?? ''))
                .toLowerCase()
                .indexOf(needle) > -1
            )
              return true;
          }
        }
      } else {
        /**
         * If there is no fields template, just search through
         * the first layer of the props values.
         */
        for (const prop in option) {
          if (
            String(_get(option, prop) ?? '')
              .toLowerCase()
              .indexOf(needle) > -1
          )
            return true;
        }
      }
    }
  }

  /* === CREATE === */

  get createPath() {
    return this.formatPath(this.props.createPath) || this.fetchPath;
  }

  get createEntity() {
    return this.props.createEntity === true
      ? this.fetchEntity
      : this.props.createEntity || '';
  }

  get createFieldsTemplate() {
    return this.resolveFieldsTemplate(
      this.props.createFieldsTemplate,
      this.createEntity
    );
  }

  get createLabel() {
    return (
      this.props.createLabel || `Create ${snakeToClean(this.createEntity)}`
    );
  }

  createDialogLoading = iref(false);

  async showCreateDialog() {
    this.createDialogLoading = true;
    try {
      this.$q
        .dialog({
          component: BlFormDialog,
          componentProps: {
            width: 500,
            title: this.createLabel,
            submitLabel: 'Create',
            fieldsTemplate: formatFieldsTemplate(
              this.createFieldsTemplate,
              'createForm'
            ),
            submitFunction: (value: any) => this.createEntityRequest(value),
          },
        })
        .onOk((savedData: IKeyValue) => {
          this.$q.notify({
            message: `${savedData?.name || 'Item'} successfully created`,
            color: 'positive',
          });

          /** Push data to the options list. */
          this.fetchedData.push(savedData);

          /** Add data to the QSelect input. */
          this.input?.add(savedData);

          /** Run the empty filter to refresh the options list. */
          this.input?.filter('');

          /** Reset to default variant. */
          this.setDefaultActiveVariant();
        });
    } catch (err) {
      this.$q.notify({
        message: parseErrorMessage(err),
        color: 'negative',
      });
    } finally {
      this.createDialogLoading = false;
    }
  }

  async createEntityRequest(data: IKeyValue): Promise<any> {
    const createData = formatUpdatePayload(data);
    return await BlacklineApi.postCustom(this.createPath, createData);
  }

  get createEntityAsOption() {
    return this.props.createEntityAsOption;
  }

  addCreateEntityAsOption() {
    if (
      this.createEntity &&
      this.createEntityAsOption &&
      (this.filteredOptions?.[0] as IKeyValue)?.value !== '__create_entity__'
    ) {
      /** Prepend Add New Link to the top of the list.  */
      this.filteredOptions.unshift({
        label: this.createLabel,
        icon: 'add',
        value: '__create_entity__',
      });
    }
  }

  /* === UPDATE === */

  get updatePath() {
    return this.formatPath(this.props.updatePath) || this.fetchPath;
  }

  get updateEntity() {
    return this.props.updateEntity === true
      ? this.fetchEntity
      : this.props.updateEntity || '';
  }

  get updateFieldsTemplate() {
    return this.resolveFieldsTemplate(
      this.props.updateFieldsTemplate,
      this.updateEntity
    );
  }

  get updateLabel() {
    return (
      this.props.updateLabel || `Create ${snakeToClean(this.updateEntity)}`
    );
  }

  /* === UPDATE MODEL VALUE === */

  onAdd(details: any) {
    // this.emit('onAdd', details);
  }

  sanitizeModelValue(value: any) {
    return value;
  }

  updateModelValue(value: any) {
    const sanitizedValue = this.sanitizeModelValue(value);
    this.emit('update:model-value', sanitizedValue);
    this.emit('update:selected-items', sanitizedValue);
  }

  onUpdateModelValue(value: any) {
    const isArrayValue = Array.isArray(value);
    const addValue = isArrayValue ? value[value.length - 1] : value;

    if ([addValue, addValue?.value].includes('__create_entity__')) {
      if (isArrayValue) {
        this.input?.removeAtIndex(value.length - 1);
      }
      this.showCreateDialog();
    } else {
      this.updateModelValue(value);
    }
  }

  /* === REMOVE === */

  get canRemoveChip() {
    return this.useChips;
  }

  onRemoveChip(scope: any) {
    return scope.removeAtIndex(scope.index);
  }

  onRemove(details: IFnParameter<QSelectProps, 'onRemove', 0>) {
    this.emit('remove', details);
  }

  /* === ERRORS & VALIDATION === */

  errorMessage = iref('');

  get validationRules() {
    return this.field.validationRules;
  }

  validate(...args: any) {
    return this.input?.validate(...args) ?? false;
  }

  /* === DRAG AND DROP === */

  get draggable() {
    return this.props.draggable && this.multiple;
  }

  onDragStart(event: DragEvent, index: number) {
    const dragEvent = (event as any).originalEvent || event;

    dragEvent.target?.closest('.q-chip')?.classList?.add('q-chip__drag-hide');
    dragEvent.dataTransfer.setData('index', index);
  }

  onDragEnter(event: DragEvent) {
    event.preventDefault();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    (event.target as HTMLElement)
      ?.closest('.q-chip')
      ?.classList?.add('q-chip__drag-hover');
  }

  onDragLeave(event: DragEvent) {
    (event.target as any)
      ?.closest('.q-chip')
      .classList?.remove('q-chip__drag-hover');
  }

  reorderItems(
    array: [],
    dragIndex: string | number,
    dropIndex: string | number
  ) {
    dragIndex = parseInt(dragIndex as string);
    dropIndex = parseInt(dropIndex as string);
    const dragElement = array.slice(dragIndex, dragIndex + 1);
    if (dragIndex > dropIndex) {
      array.splice(dragIndex, 1);
      array.splice(dropIndex, 0, ...dragElement);
    } else {
      array.splice(dropIndex + 1, 0, ...dragElement);
      array.splice(dragIndex, 1);
    }
  }

  onDrop(event: DragEvent, dropIndex: any) {
    const dropEvent = (event as any).originalEvent || event;

    dropEvent.target
      ?.closest('.q-chip')
      .classList?.remove('q-chip__drag-hover');
    dropEvent.target?.closest('.q-chip').classList?.remove('q-chip__drag-hide');

    const dragIndex = dropEvent?.dataTransfer?.getData('index');

    const values = _cloneDeep(this.modelValue);

    this.reorderItems(values, dragIndex, dropIndex);

    this.emit('update:model-value', values);
  }

  onDragEnd(event: DragEvent) {
    (event.srcElement as HTMLElement)?.classList?.remove('q-chip__drag-hide');
  }
}

/**
 * Blackline Contact Field for Project & Transaction Contacts.
 *
 * Breakthrough Architecture based on ivue (Infinite Vue).
 * Fully Typesafe Extensible components in Vue 3.
 * Extending BlChooseFieldClass class with extended props and emits.
 * @see {BlChooseContactField.vue}
 */
export class BlChooseContactFieldClass extends BlChooseFieldClass {
  declare emit: BlChooseContactFieldEmits; // Extend emit types
  declare props: BlChooseContactFieldProps; // Extend prop types

  // ============================
  // CONTACT FIELD PROPS
  // ============================
  get transactionId() {
    return this.props.transactionId;
  }

  get contactType() {
    return this.props.contactType;
  }

  get useVariants() {
    return this.props.useVariants;
  }

  // ============================
  // EXTENSIONS OF CHOOSE CLASS
  // ============================

  /**
   * Extend newValueMode for creating new items when you type
   * used for adding custom emails into transaction contact.
   * @extends @see {BlChooseFieldClass.newValueMode}
   */
  get newValueMode() {
    return (
      super.newValueMode ??
      (this.optionValue === 'email' ? 'add-unique' : super.newValueMode)
    );
  }

  /**
   * Extend fetch entity computed resolution.
   * @extends @see {BlChooseFieldClass.fetchEntity}
   */
  get fetchEntity() {
    return (
      super.fetchEntity ||
      (this.transactionId
        ? 'transaction_contact'
        : this.projectId
        ? 'project_contact'
        : 'user')
    );
  }

  /**
   * Extending paths to add transaction id into the path.
   * @extends @see {BlChooseFieldClass.formatPath}
   */
  formatPath(str: string) {
    return super
      .formatPath(str)
      .replaceAll(':transaction_id', this.transactionId);
  }

  // /**
  //  * Extend fetch path to resolve dynamically.
  //  * @extends @see {BlChooseFieldClass.fetchPath}
  //  */
  // get fetchPath() {
  //   return (
  //     super.fetchPath ||
  //     this.formatPath(
  //       this.transactionId
  //         ? '/project/:project_id/transaction/:transaction_id/transaction_contact'
  //         : this.projectId
  //         ? '/project/:project_id/project_contact'
  //         : '/admin/user'
  //     )
  //   );
  // }

  // /**
  //  * Extend variants with contact type definitions.
  //  * @extends @see {BlChooseFieldClass.variants}
  //  */
  // get variants() {
  //   const variants: BlChooseFieldVariant[] = [];
  //   if (this.useVariants && this.contactType?.length) {
  //     let fetchFilters = '';
  //     let fetchSort = '';

  //     if (this.transactionId) {
  //       // transaction_contact is varchar
  //       const contactTypeArray = formatPgArrayOfValues(this.contactType);
  //       fetchFilters = `project_contact_type IN (${contactTypeArray})`;
  //       fetchSort =
  //         'project_contact_type:asc,project_contact.first_name:asc,project_contact.last_name:asc';
  //     } else {
  //       // project_contact is jsonb array
  //       fetchFilters = this.contactType
  //         .map((type) => `project_contact_type ? ${formatPgValue(type)}`)
  //         .join(' OR ');
  //       fetchSort =
  //         'project_contact.first_name:asc,project_contact.last_name:asc';
  //     }

  //     /** Make specific variant for each contact type. */
  //     this.contactType.forEach((type) => {
  //       let fetchFilters = '';

  //       if (this.transactionId) {
  //         // transaction_contact is varchar
  //         fetchFilters = `project_contact_type = ${formatPgValue(type)}`;
  //       } else {
  //         // project_contact is jsonb array
  //         fetchFilters = `project_contact_type ? ${formatPgValue(type)}`;
  //       }

  //       variants.push({
  //         label: snakeToClean(type) + 's',
  //         fetchFilters,
  //       });
  //     });

  //     /** Make All -> Broad Variant */
  //     if (variants.length > 1) {
  //       variants.unshift({
  //         label: 'All',
  //         fetchFilters,
  //         fetchSort,
  //       });
  //     }
  //   }

  //   return super.variants.length
  //     ? super.variants
  //     : this.projectId
  //     ? variants
  //     : [];
  // }

  // get fetchPagination() {
  //   return super.fetchPagination || (this.projectId ? false : true);
  // }
}
