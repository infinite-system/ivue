/**
 * server.ts — reference Express backend (TypeScript — Node 22.6+ runs it natively: `node server.ts`) for the field components.
 *
 * Implements the exact wire contract the playground's in-browser mock
 * implements (ServerApi.ts documents it), so the components run against
 * this server by swapping one line:
 *
 *   ServerApi.use(httpTransport('http://localhost:4300'));
 *
 * Endpoints:
 *   GET    /:collection?filters=<expr>&sort=<col:asc>&page=&rowsPerPage=
 *   POST   /:collection            create a row
 *   PUT    /:collection/:id        update a row
 *   DELETE /:collection/:id        delete a row
 *   POST   /media/upload           multipart upload (+ sharp thumbnails)
 *   GET    /media/file/:key        stream the bytes (or redirect to S3)
 *   POST   /media/update           rename / recaption
 *   GET    /media?ids[0]=..        fetch media rows
 *
 * Storage driver is picked by env: STORAGE=s3 uses storage-s3.ts
 * (presigned GET redirects, like a production setup); default is
 * storage-disk.ts (plain files under ./uploads — zero dependencies).
 *
 *   npm i express express-fileupload cors sharp        # base
 *   npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner   # only for S3
 *   node server.ts
 */
import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import { compileFilter, applySort } from '../src/examples/fields/server/filter-expression.ts';
import { seedCollections } from './seed.ts';

const storage =
  process.env.STORAGE === 's3'
    ? await import('./storage-s3.ts')
    : await import('./storage-disk.ts');

const PORT = process.env.PORT ?? 4300;
const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: './tmp/' }));

/** In-memory collections seeded like the mock; swap for a real database. */
const collections = seedCollections();
let nextId = Date.now();

/* ---------------- media ---------------- */

app.post('/media/upload', async (request, response) => {
  const incoming = request.files?.files;
  const files = Array.isArray(incoming) ? incoming : incoming ? [incoming] : [];
  const uploaded = [];
  for (const file of files) {
    const key = `m${nextId++}`;
    await storage.saveFile(key, file); // disk write or S3 PutObject
    const thumbnailKey = await storage.saveThumbnail(key, file); // sharp, width 400
    const row = {
      id: key,
      key,
      name: request.body.name || file.name,
      mimetype: file.mimetype,
      size: file.size,
      url: `/media/file/${key}`,
      thumbnailUrl: thumbnailKey ? `/media/file/${thumbnailKey}` : `/media/file/${key}`,
      createdAt: new Date().toISOString(),
    };
    collections.media.push(row);
    uploaded.push(row);
  }
  response.json({ data: uploaded });
});

app.get('/media/file/:key', async (request, response) => {
  // disk: streams the bytes; s3: 302-redirects to a presigned GET URL
  await storage.sendFile(request.params.key, response);
});

app.post('/media/update', (request, response) => {
  const row = collections.media.find((media) => media.id === request.body.id);
  if (row) {
    if (request.body.name !== undefined) row.name = request.body.name;
    if (request.body.caption !== undefined) row.caption = request.body.caption;
  }
  response.json({ data: row ?? null });
});

app.get('/media', (request, response) => {
  const ids = Object.entries(request.query)
    .filter(([name]) => name.startsWith('ids['))
    .map(([, value]) => value);
  const rows = ids.length
    ? collections.media.filter((media) => ids.includes(media.id))
    : collections.media;
  response.json({ data: rows });
});

app.delete('/media/:id', async (request, response) => {
  const index = collections.media.findIndex(
    (media) => media.id === request.params.id,
  );
  if (index >= 0) {
    const [row] = collections.media.splice(index, 1);
    await storage.deleteFile(row.key);
  }
  response.json({ data: true });
});

/* ---------------- generic entity CRUD ---------------- */

app.get('/:collection', (request, response) => {
  const rows = collections[request.params.collection] ?? [];
  const predicate = compileFilter(String(request.query.filters ?? ''));
  let result = applySort(rows.filter(predicate), String(request.query.sort ?? ''));

  const page = Number(request.query.page ?? 0);
  const rowsPerPage = Number(request.query.rowsPerPage ?? 0);
  if (page > 0 && rowsPerPage > 0) {
    const start = (page - 1) * rowsPerPage;
    return response.json({
      data: result.slice(start, start + rowsPerPage),
      pagination: { page, rowsPerPage, rowsNumber: result.length },
    });
  }
  response.json({ data: result });
});

app.post('/:collection', (request, response) => {
  const collection = (collections[request.params.collection] ??= []);
  const row = { id: String(nextId++), ...request.body };
  collection.push(row);
  response.json({ data: row });
});

app.put('/:collection/:id', (request, response) => {
  const collection = collections[request.params.collection] ?? [];
  const row = collection.find((entry) => String(entry.id) === request.params.id);
  if (row) Object.assign(row, request.body);
  response.json({ data: row ?? null });
});

app.delete('/:collection/:id', (request, response) => {
  const collection = collections[request.params.collection] ?? [];
  const index = collection.findIndex(
    (entry) => String(entry.id) === request.params.id,
  );
  if (index >= 0) collection.splice(index, 1);
  response.json({ data: true });
});

app.listen(PORT, () => {
  console.log(`field server listening on :${PORT} (storage: ${process.env.STORAGE ?? 'disk'})`);
});
