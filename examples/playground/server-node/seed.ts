/**
 * seed.ts — the Node server starts with the same seed rows the browser
 * mock uses; single source in src/examples/fields/server/demo-data.ts.
 * Swap for a real database in production.
 */
import {
  seedContacts,
  seedTags,
} from '../src/examples/fields/server/demo-data.ts';

export function seedCollections() {
  return {
    contact: structuredClone(seedContacts),
    tag: structuredClone(seedTags),
    media: [],
  };
}
