import { createHash, createHmac, randomUUID } from 'node:crypto';
import { and, count, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import { webAgentImageUploads } from '@voomate/db';
import sharp from 'sharp';
import { getWebAgentDb } from './db';
import { logRunEvent, recordRunUsage, type RunContext } from './log';
import { WEB_AGENT_IMAGE_BUCKET, webAgentStorage } from './storage';

export const MAX_IMAGES_PER_MESSAGE = 2;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_SESSION = 10;
export const MAX_IMAGE_EDGE = 1568;
const MAX_INPUT_PIXELS = 40_000_000;
const FINALIZE_WINDOW_MS = 10 * 60 * 1000;
const SIGNED_UPLOAD_LIFETIME_MS = 2 * 60 * 60 * 1000;
const RETENTION_MS = 48 * 60 * 60 * 1000;

export type AllowedImageFormat = 'jpeg' | 'png' | 'webp';

export interface DeclaredImage {
  name: string;
  size: number;
  type: string;
}

export interface NovaImage {
  id: string;
  format: 'webp';
  bytes: Uint8Array;
  sourceBytes: number;
  processedBytes: number;
  width: number;
  height: number;
}

export class ImageUploadError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

const mimeToFormat = new Map<string, AllowedImageFormat>([
  ['image/jpeg', 'jpeg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

function extension(format: AllowedImageFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

function opaqueTenantScope(organizationId: string, agentId: string): string {
  const secret = process.env.WIDGET_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error('WIDGET_TOKEN_SECRET is required.');
  return createHmac('sha256', secret)
    .update(`image-path:${organizationId}:${agentId}`)
    .digest('hex')
    .slice(0, 32);
}

export function sniffImageFormat(bytes: Uint8Array): AllowedImageFormat | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'webp';
  }
  return undefined;
}

export async function normalizeImage(bytes: Uint8Array): Promise<{
  data: Buffer;
  sourceFormat: AllowedImageFormat;
  width: number;
  height: number;
}> {
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageUploadError('Each image must be 5 MB or smaller.', 413);
  }
  const sourceFormat = sniffImageFormat(bytes);
  if (!sourceFormat) {
    throw new ImageUploadError('The uploaded file is not a valid JPG, PNG, or WebP image.');
  }

  try {
    const decoder = sharp(bytes, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS });
    const metadata = await decoder.metadata();
    if (metadata.format !== sourceFormat || !metadata.width || !metadata.height) {
      throw new ImageUploadError('The image encoding does not match its real file type.');
    }
    if ((metadata.pages ?? 1) !== 1) {
      throw new ImageUploadError('Animated or multi-page images are not supported.');
    }

    // rotate() honors EXIF orientation before the rewrite. Sharp strips EXIF/GPS/XMP/IPTC by
    // default because keepMetadata/withMetadata are intentionally never called here.
    const output = await sharp(bytes, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({
        width: MAX_IMAGE_EDGE,
        height: MAX_IMAGE_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (!output.info.width || !output.info.height) {
      throw new ImageUploadError('The image could not be decoded.');
    }
    return {
      data: output.data,
      sourceFormat,
      width: output.info.width,
      height: output.info.height,
    };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError('The uploaded file is corrupt or cannot be decoded.');
  }
}

function validateDeclarations(files: readonly DeclaredImage[]): AllowedImageFormat[] {
  if (files.length < 1 || files.length > MAX_IMAGES_PER_MESSAGE) {
    throw new ImageUploadError('Attach between 1 and 2 images per message.');
  }
  return files.map((file) => {
    const format = mimeToFormat.get(file.type.toLowerCase());
    if (!format) throw new ImageUploadError('Only JPG, PNG, and WebP images are allowed.');
    if (!Number.isInteger(file.size) || file.size < 1 || file.size > MAX_IMAGE_BYTES) {
      throw new ImageUploadError('Each image must be 5 MB or smaller.', 413);
    }
    if (!file.name || file.name.length > 240) throw new ImageUploadError('Invalid image name.');
    return format;
  });
}

export async function createImageUploadSlots(options: {
  context: RunContext;
  sessionFingerprint: string;
  files: readonly DeclaredImage[];
  conversationId?: string;
}): Promise<Array<{ id: string; signedUrl: string; path: string; finalizeWithinSeconds: number }>> {
  const formats = validateDeclarations(options.files);
  const db = getWebAgentDb();
  const sessionWindow = new Date(Date.now() - 15 * 60 * 1000);
  const [existing] = await db
    .select({ value: count() })
    .from(webAgentImageUploads)
    .where(
      and(
        eq(webAgentImageUploads.organizationId, options.context.organizationId),
        eq(webAgentImageUploads.agentId, options.context.agentId),
        eq(webAgentImageUploads.sessionFingerprint, options.sessionFingerprint),
        gte(webAgentImageUploads.createdAt, sessionWindow),
      ),
    );
  if ((existing?.value ?? 0) + options.files.length > MAX_IMAGES_PER_SESSION) {
    throw new ImageUploadError('This session has reached its image-upload limit.', 429);
  }

  const now = Date.now();
  const tenantScope = opaqueTenantScope(options.context.organizationId, options.context.agentId);
  const rows = options.files.map((_, index) => {
    const id = randomUUID();
    const format = formats[index]!;
    return {
      id,
      organizationId: options.context.organizationId,
      agentId: options.context.agentId,
      conversationId: options.conversationId,
      sessionFingerprint: options.sessionFingerprint,
      // The signed URL exposes this path to the browser, so tenant/agent UUIDs must not appear.
      quarantinePath: `${tenantScope}/${options.sessionFingerprint}/${id}/quarantine.${extension(format)}`,
      finalizeBefore: new Date(now + FINALIZE_WINDOW_MS),
      // Supabase signed upload URLs live for two hours; retain the known quarantine path until
      // just after that window so a late upload is still removed by cleanup.
      purgeAfter: new Date(now + SIGNED_UPLOAD_LIFETIME_MS + 5 * 60 * 1000),
    };
  });
  await db.insert(webAgentImageUploads).values(rows);

  const bucket = webAgentStorage().storage.from(WEB_AGENT_IMAGE_BUCKET);
  const slots = [];
  try {
    for (const row of rows) {
      const { data, error } = await bucket.createSignedUploadUrl(row.quarantinePath, {
        upsert: false,
      });
      if (error || !data) throw new Error(error?.message ?? 'Could not create upload URL.');
      slots.push({
        id: row.id,
        signedUrl: data.signedUrl,
        path: data.path,
        finalizeWithinSeconds: FINALIZE_WINDOW_MS / 1000,
      });
    }
  } catch {
    await db
      .update(webAgentImageUploads)
      .set({ status: 'rejected', rejectionReason: 'signing_failed', updatedAt: new Date() })
      .where(
        inArray(
          webAgentImageUploads.id,
          rows.map((row) => row.id),
        ),
      );
    throw new ImageUploadError('Secure image upload is temporarily unavailable.', 503);
  }

  await logRunEvent(options.context, 'image_upload_signed', 'success', {
    imageCount: rows.length,
    maxBytesEach: MAX_IMAGE_BYTES,
    finalizeWindowSeconds: FINALIZE_WINDOW_MS / 1000,
  });
  return slots;
}

async function rejectImage(id: string, quarantinePath: string, reason: string): Promise<void> {
  await webAgentStorage().storage.from(WEB_AGENT_IMAGE_BUCKET).remove([quarantinePath]);
  await getWebAgentDb()
    .update(webAgentImageUploads)
    .set({
      status: 'rejected',
      rejectionReason: reason,
      purgeAfter: new Date(Date.now() + RETENTION_MS),
      updatedAt: new Date(),
    })
    .where(eq(webAgentImageUploads.id, id));
}

export async function finalizeImageUploads(options: {
  context: RunContext;
  sessionFingerprint: string;
  imageIds: readonly string[];
}): Promise<Array<{ id: string; width: number; height: number; bytes: number }>> {
  if (options.imageIds.length < 1 || options.imageIds.length > MAX_IMAGES_PER_MESSAGE) {
    throw new ImageUploadError('Finalize between 1 and 2 images at a time.');
  }
  if (new Set(options.imageIds).size !== options.imageIds.length) {
    throw new ImageUploadError('Duplicate image attachment IDs are not allowed.');
  }

  const db = getWebAgentDb();
  const rows = await db
    .select()
    .from(webAgentImageUploads)
    .where(
      and(
        inArray(webAgentImageUploads.id, [...options.imageIds]),
        eq(webAgentImageUploads.organizationId, options.context.organizationId),
        eq(webAgentImageUploads.agentId, options.context.agentId),
        eq(webAgentImageUploads.sessionFingerprint, options.sessionFingerprint),
        eq(webAgentImageUploads.status, 'pending'),
      ),
    );
  if (rows.length !== options.imageIds.length) {
    throw new ImageUploadError('One or more image uploads are invalid, expired, or already used.');
  }

  const bucket = webAgentStorage().storage.from(WEB_AGENT_IMAGE_BUCKET);
  const finalized = [];
  for (const row of rows) {
    if (row.finalizeBefore <= new Date()) {
      await rejectImage(row.id, row.quarantinePath, 'finalize_window_expired');
      throw new ImageUploadError('The image upload expired. Please attach it again.');
    }
    const { data: source, error: downloadError } = await bucket.download(row.quarantinePath);
    if (downloadError || !source) {
      throw new ImageUploadError('The image upload did not complete. Please try again.');
    }
    const bytes = new Uint8Array(await source.arrayBuffer());
    try {
      const normalized = await normalizeImage(bytes);
      const processedPath = row.quarantinePath.replace(/\/quarantine\.[^.]+$/, '/processed.webp');
      const { error: uploadError } = await bucket.upload(processedPath, normalized.data, {
        contentType: 'image/webp',
        cacheControl: '0',
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);
      await bucket.remove([row.quarantinePath]);

      await db
        .update(webAgentImageUploads)
        .set({
          status: 'processed',
          processedPath,
          sourceBytes: bytes.byteLength,
          processedBytes: normalized.data.byteLength,
          sourceFormat: normalized.sourceFormat,
          processedFormat: 'webp',
          width: normalized.width,
          height: normalized.height,
          sourceSha256: createHash('sha256').update(bytes).digest('hex'),
          processedAt: new Date(),
          purgeAfter: new Date(Date.now() + RETENTION_MS),
          updatedAt: new Date(),
        })
        .where(eq(webAgentImageUploads.id, row.id));
      recordRunUsage(options.context, 'image_upload_bytes', bytes.byteLength);
      await logRunEvent(options.context, 'image_validated', 'success', {
        imageId: row.id,
        sourceFormat: normalized.sourceFormat,
        sourceBytes: bytes.byteLength,
        processedBytes: normalized.data.byteLength,
        width: normalized.width,
        height: normalized.height,
        metadataStripped: true,
      });
      finalized.push({
        id: row.id,
        width: normalized.width,
        height: normalized.height,
        bytes: normalized.data.byteLength,
      });
    } catch (error) {
      const reason = error instanceof ImageUploadError ? error.message : 'processing_failed';
      await rejectImage(row.id, row.quarantinePath, reason);
      throw error instanceof ImageUploadError
        ? error
        : new ImageUploadError('The image could not be processed securely.');
    }
  }
  return finalized;
}

export async function consumeImagesForMessage(options: {
  context: RunContext;
  sessionFingerprint: string;
  imageIds: readonly string[];
}): Promise<NovaImage[]> {
  if (options.imageIds.length === 0) return [];
  if (
    options.imageIds.length > MAX_IMAGES_PER_MESSAGE ||
    new Set(options.imageIds).size !== options.imageIds.length
  ) {
    throw new ImageUploadError('A message can contain at most 2 unique images.');
  }
  const now = new Date();
  const rows = await getWebAgentDb()
    .update(webAgentImageUploads)
    .set({ status: 'consumed', consumedAt: now, updatedAt: now })
    .where(
      and(
        inArray(webAgentImageUploads.id, [...options.imageIds]),
        eq(webAgentImageUploads.organizationId, options.context.organizationId),
        eq(webAgentImageUploads.agentId, options.context.agentId),
        eq(webAgentImageUploads.sessionFingerprint, options.sessionFingerprint),
        eq(webAgentImageUploads.status, 'processed'),
        gte(webAgentImageUploads.purgeAfter, now),
      ),
    )
    .returning();
  if (rows.length !== options.imageIds.length) {
    throw new ImageUploadError('One or more images are invalid, expired, or already used.');
  }

  const bucket = webAgentStorage().storage.from(WEB_AGENT_IMAGE_BUCKET);
  const images: NovaImage[] = [];
  for (const row of rows) {
    if (!row.processedPath || !row.processedBytes || !row.width || !row.height) {
      throw new ImageUploadError('An image attachment is not ready.');
    }
    const { data, error } = await bucket.download(row.processedPath);
    if (error || !data) throw new ImageUploadError('An image attachment could not be loaded.');
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (sniffImageFormat(bytes) !== 'webp' || bytes.byteLength !== row.processedBytes) {
      throw new ImageUploadError('An image attachment failed its integrity check.');
    }
    images.push({
      id: row.id,
      format: 'webp',
      bytes,
      sourceBytes: row.sourceBytes ?? bytes.byteLength,
      processedBytes: bytes.byteLength,
      width: row.width,
      height: row.height,
    });
  }
  await logRunEvent(options.context, 'image_attachments_loaded', 'success', {
    imageCount: images.length,
    processedBytes: images.reduce((total, image) => total + image.processedBytes, 0),
  });
  return images;
}

export async function attachImagesToMessage(
  context: RunContext,
  imageIds: readonly string[],
  messageId: string,
): Promise<void> {
  if (imageIds.length === 0 || !context.conversationId) return;
  await getWebAgentDb()
    .update(webAgentImageUploads)
    .set({ conversationId: context.conversationId, messageId, updatedAt: new Date() })
    .where(
      and(
        inArray(webAgentImageUploads.id, [...imageIds]),
        eq(webAgentImageUploads.organizationId, context.organizationId),
        eq(webAgentImageUploads.agentId, context.agentId),
        eq(webAgentImageUploads.status, 'consumed'),
      ),
    );
}

/** Delete raw abandoned uploads after signed URLs expire and sanitized images after 48 hours. */
export async function cleanupExpiredImages(limit = 100): Promise<number> {
  const db = getWebAgentDb();
  const rows = await db
    .select()
    .from(webAgentImageUploads)
    .where(
      and(
        lte(webAgentImageUploads.purgeAfter, new Date()),
        ne(webAgentImageUploads.status, 'deleted'),
      ),
    )
    .limit(limit);
  if (rows.length === 0) return 0;
  const paths = rows.flatMap((row) =>
    [row.quarantinePath, row.processedPath].filter((path): path is string => Boolean(path)),
  );
  if (paths.length > 0) await webAgentStorage().storage.from(WEB_AGENT_IMAGE_BUCKET).remove(paths);
  await db
    .update(webAgentImageUploads)
    .set({ status: 'deleted', deletedAt: new Date(), updatedAt: new Date() })
    .where(
      inArray(
        webAgentImageUploads.id,
        rows.map((row) => row.id),
      ),
    );
  return rows.length;
}
