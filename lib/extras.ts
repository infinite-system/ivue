/**
 * `ivue/extras` — the ivue toolkit beyond the reactive core.
 *
 * Kept out of the primary `ivue` entry so that entry stays minimal (the
 * 1.1kb reactive engine). Import these explicitly:
 *
 *   import { Static } from 'ivue/extras';
 */
export { Static, type ClassConstructor } from './Static';
export { LazyShared } from './LazyShared';
export { nestedProps, type NestedPartial, type NestedProps } from './nestedProps';
