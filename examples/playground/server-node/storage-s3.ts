/**
 * storage-s3.ts — the S3 storage driver, shaped like a production setup:
 * uploads stream to a private bucket, thumbnails are generated server-side
 * with sharp, and GET requests 302-redirect to short-lived presigned URLs
 * so S3 serves the bytes (including Range requests for video).
 *
 * Env: AWS credentials via the standard chain, plus
 *   S3_BUCKET=my-files-bucket  AWS_REGION=us-east-1  STORAGE=s3
 */
import { promises as fs } from 'node:fs';
import sharp from 'sharp';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.S3_BUCKET;
const SIGNED_URL_TTL_SECONDS = 6 * 60 * 60;
const s3 = new S3Client({});

export async function saveFile(key: string, file: any) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: await fs.readFile(file.tempFilePath),
      ContentType: file.mimetype,
      Metadata: { originalname: encodeURIComponent(file.name) },
    }),
  );
}

/** Width-400 JPEG thumbnail, generated before the temp file is discarded. */
export async function saveThumbnail(key: string, file: any): Promise<string | null> {
  if (!file.mimetype?.startsWith('image/') || file.mimetype === 'image/svg+xml') {
    return null;
  }
  const thumbnailKey = `thumb:${key}`;
  try {
    const body = await sharp(file.tempFilePath)
      .resize({ width: 400, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: thumbnailKey,
        Body: body,
        ContentType: 'image/jpeg',
      }),
    );
    return thumbnailKey;
  } catch {
    return null;
  }
}

/** Auth here, bytes from S3: redirect to a presigned GET URL. */
export async function sendFile(key: string, response: any) {
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
  response.setHeader('Cache-Control', 'max-age=3600, must-revalidate');
  response.redirect(302, url);
}

export async function deleteFile(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `thumb:${key}` }));
}
