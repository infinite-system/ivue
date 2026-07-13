// MockServer.ts — the in-browser transport behind ServerApi.
//
// A complete, honest implementation of the server contract with no server:
// entity collections persist in localStorage, media bytes persist in
// IndexedDB (previews served through object URLs), every call pays a
// simulated network latency so loading states behave truthfully. Each
// visitor gets a pristine private sandbox. The same components run against
// server-node/server.mjs by swapping the transport.

import type { MediaRow, RequestOptions, ServerTransport } from './ServerApi';
import { applySort, compileFilter } from './filter-expression';
import { seedContacts, seedTags } from './demo-data';

const STORAGE_KEY = 'ivue-playground-mock-server';
const LATENCY_MS = 180;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/* Entity store — localStorage                                         */
/* ------------------------------------------------------------------ */

type Collections = Record<string, any[]>;

function loadCollections(): Collections {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* corrupted or unavailable storage — reseed */
  }
  return { contact: [...seedContacts], tag: [...seedTags], media: [] };
}

function saveCollections(collections: Collections) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  } catch {
    /* quota exceeded — keep serving from memory */
  }
}

/* ------------------------------------------------------------------ */
/* Media bytes — IndexedDB                                             */
/* ------------------------------------------------------------------ */

const DB_NAME = 'ivue-playground-media';
const BLOB_STORE = 'blobs';

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(BLOB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putBlob(key: string, blob: Blob) {
  const db = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    tx.objectStore(BLOB_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getBlob(key: string): Promise<Blob | undefined> {
  const db = await openMediaDb();
  return await new Promise((resolve, reject) => {
    const request = db
      .transaction(BLOB_STORE, 'readonly')
      .objectStore(BLOB_STORE)
      .get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteBlob(key: string) {
  const db = await openMediaDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    tx.objectStore(BLOB_STORE).delete(key);
    tx.oncomplete = () => resolve();
  });
}

/** Object URLs by key — created lazily, reused for the session. */
const objectUrls = new Map<string, string>();

async function urlFor(key: string): Promise<string> {
  const existing = objectUrls.get(key);
  if (existing) return existing;
  const blob = await getBlob(key);
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  objectUrls.set(key, url);
  return url;
}

/**
 * Thumbnail an image blob in the browser — the mock's stand-in for the
 * server's sharp pipeline (see server-node/server.mjs).
 */
async function makeThumbnail(blob: Blob, maxWidth = 400): Promise<Blob | null> {
  if (!blob.type.startsWith('image/') || blob.type === 'image/svg+xml') {
    return null;
  }
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) =>
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.85),
    );
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* The transport                                                       */
/* ------------------------------------------------------------------ */

let collections = loadCollections();
let nextId = Date.now();

function listEndpoint(collection: any[], query: URLSearchParams) {
  const predicate = compileFilter(query.get('filters') ?? '');
  let rows = collection.filter(predicate);
  rows = applySort(rows, query.get('sort') ?? '');

  const page = Number(query.get('page') ?? 0);
  const rowsPerPage = Number(query.get('rowsPerPage') ?? 0);
  if (page > 0 && rowsPerPage > 0) {
    const start = (page - 1) * rowsPerPage;
    return {
      data: rows.slice(start, start + rowsPerPage),
      pagination: { page, rowsPerPage, rowsNumber: rows.length },
    };
  }
  return { data: rows };
}

async function hydrateMediaRow(row: MediaRow): Promise<MediaRow> {
  return {
    ...row,
    url: await urlFor(row.key),
    thumbnailUrl: (await urlFor(`thumb:${row.key}`)) || (await urlFor(row.key)),
  };
}

export const mockServerTransport: ServerTransport = {
  async request(method, path, options: RequestOptions = {}) {
    await wait(LATENCY_MS);
    const [pathname, queryString] = path.split('?');
    const query = new URLSearchParams(queryString ?? '');
    const segments = pathname.split('/').filter(Boolean);

    /* ---- media endpoints ---- */
    if (segments[0] === 'media') {
      if (method === 'POST' && segments[1] === 'upload') {
        const uploaded: MediaRow[] = [];
        for (const file of options.files ?? []) {
          const key = `m${nextId++}`;
          await putBlob(key, file);
          const thumbnail = await makeThumbnail(file);
          if (thumbnail) await putBlob(`thumb:${key}`, thumbnail);
          const row: MediaRow = {
            id: key,
            key,
            name: options.payload?.name || file.name,
            mimetype: file.type || 'application/octet-stream',
            size: file.size,
            url: '',
            thumbnailUrl: '',
            createdAt: new Date().toISOString(),
          };
          collections.media.push(row);
          uploaded.push(await hydrateMediaRow(row));
        }
        saveCollections(collections);
        return { data: uploaded };
      }
      if (method === 'POST' && segments[1] === 'update') {
        const row = collections.media.find(
          (media) => media.id === options.payload?.id,
        );
        if (row) {
          if (options.payload.name !== undefined) row.name = options.payload.name;
          if (options.payload.caption !== undefined) {
            row.caption = options.payload.caption;
          }
          saveCollections(collections);
          return { data: await hydrateMediaRow(row) };
        }
        return { data: null };
      }
      if (method === 'DELETE' && segments[1]) {
        const index = collections.media.findIndex(
          (media) => media.id === segments[1],
        );
        if (index >= 0) {
          const [row] = collections.media.splice(index, 1);
          await deleteBlob(row.key);
          await deleteBlob(`thumb:${row.key}`);
          saveCollections(collections);
        }
        return { data: true };
      }
      if (method === 'GET') {
        const ids = [...query.entries()]
          .filter(([name]) => name.startsWith('ids['))
          .map(([, value]) => value);
        const rows = ids.length
          ? collections.media.filter((media) => ids.includes(media.id))
          : listEndpoint(collections.media, query).data;
        return { data: await Promise.all(rows.map(hydrateMediaRow)) };
      }
    }

    /* ---- generic entity CRUD: /<collection>[/<id>] ---- */
    const name = segments[0];
    if (!name) throw new Error(`MockServer: empty path '${path}'`);
    collections[name] ??= [];
    const collection = collections[name];

    if (method === 'GET') return listEndpoint(collection, query);

    if (method === 'POST') {
      const row = { id: String(nextId++), ...options.payload };
      collection.push(row);
      saveCollections(collections);
      return { data: row };
    }

    if (method === 'PUT') {
      const row = collection.find((entry) => String(entry.id) === segments[1]);
      if (row) {
        Object.assign(row, options.payload);
        saveCollections(collections);
      }
      return { data: row ?? null };
    }

    if (method === 'DELETE') {
      const index = collection.findIndex(
        (entry) => String(entry.id) === segments[1],
      );
      if (index >= 0) {
        collection.splice(index, 1);
        saveCollections(collections);
      }
      return { data: true };
    }

    throw new Error(`MockServer: unhandled ${method} ${path}`);
  },
};

/**
 * Seed the media store with server-preexisting images (SVG blobs) so demos
 * can show a field HYDRATING an existing model from ids — loading media the
 * server already holds, not just uploading new files.
 */
export async function ensureSeedMedia(): Promise<MediaRow[]> {
  const existingSeeds = collections.media.filter((row: MediaRow) =>
    row.key.startsWith('seed-'),
  );
  if (existingSeeds.length) {
    return Promise.all(existingSeeds.map(hydrateMediaRow));
  }
  const artworks = [
    { name: 'aurora.svg', from: '#6366f1', to: '#34d399' },
    { name: 'ember.svg', from: '#f59e0b', to: '#ef4444' },
    { name: 'tide.svg', from: '#0ea5e9', to: '#8b5cf6' },
  ];
  const seeded: MediaRow[] = [];
  for (const [index, art] of artworks.entries()) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${art.from}"/><stop offset="1" stop-color="${art.to}"/></linearGradient></defs><rect width="480" height="480" fill="url(#g)"/><circle cx="240" cy="240" r="120" fill="rgba(255,255,255,0.22)"/></svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const key = `seed-${index + 1}`;
    await putBlob(key, blob);
    const row: MediaRow = {
      id: key,
      key,
      name: art.name,
      mimetype: 'image/svg+xml',
      size: blob.size,
      url: '',
      thumbnailUrl: '',
      createdAt: new Date().toISOString(),
    };
    collections.media.push(row);
    seeded.push(await hydrateMediaRow(row));
  }
  saveCollections(collections);
  return seeded;
}

/** Wipe the sandbox back to seed data (used by the demo's reset button). */
export async function resetMockServer() {
  localStorage.removeItem(STORAGE_KEY);
  for (const row of collections.media ?? []) {
    await deleteBlob(row.key);
    await deleteBlob(`thumb:${row.key}`);
  }
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
  collections = loadCollections();
}
