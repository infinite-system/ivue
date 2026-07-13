/**
 * storage-disk.ts — the plain storage driver: files live on the server's
 * own disk under ./uploads. Zero external services; right for small
 * deployments and self-hosting.
 */
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const UPLOAD_DIR = './uploads';
const metadata = new Map<string, { mimetype: string; name: string }>(); // key → { mimetype, name }

await fs.mkdir(UPLOAD_DIR, { recursive: true });

const pathFor = (key: string) => path.join(UPLOAD_DIR, key.replace(/[^a-zA-Z0-9:_-]/g, ''));

export async function saveFile(key: string, file: any) {
  await file.mv(pathFor(key)); // express-fileupload moves the temp file
  metadata.set(key, { mimetype: file.mimetype, name: file.name });
}

/** Generate a width-400 JPEG thumbnail for image types — same as production. */
export async function saveThumbnail(key: string, file: any): Promise<string | null> {
  if (!file.mimetype?.startsWith('image/') || file.mimetype === 'image/svg+xml') {
    return null;
  }
  const thumbnailKey = `thumb:${key}`;
  try {
    await sharp(pathFor(key))
      .resize({ width: 400, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(pathFor(thumbnailKey));
    metadata.set(thumbnailKey, { mimetype: 'image/jpeg', name: `${key}.jpg` });
    return thumbnailKey;
  } catch {
    return null;
  }
}

export async function sendFile(key: string, response: any) {
  const filePath = pathFor(key);
  try {
    await fs.access(filePath);
  } catch {
    return response.status(404).json({ error: 'not found' });
  }
  const info = metadata.get(key);
  if (info?.mimetype) response.setHeader('Content-Type', info.mimetype);
  response.setHeader('Cache-Control', 'max-age=3600, must-revalidate');
  createReadStream(filePath).pipe(response);
}

export async function deleteFile(key: string) {
  await fs.rm(pathFor(key), { force: true });
  await fs.rm(pathFor(`thumb:${key}`), { force: true });
}
