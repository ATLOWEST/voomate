import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { imageSignRequestSchema, messageRequestSchema } from './security';
import { MAX_IMAGE_BYTES, normalizeImage, sniffImageFormat } from './images';

describe('Web Agent image security', () => {
  it('decodes, resizes, converts to WebP, and strips EXIF metadata', async () => {
    const source = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: '#c2410c' },
    })
      .jpeg()
      .withExif({
        IFD0: { Artist: 'private-test' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 0/1' },
      })
      .toBuffer();

    const normalized = await normalizeImage(source);
    const metadata = await sharp(normalized.data).metadata();
    expect(normalized.sourceFormat).toBe('jpeg');
    expect(sniffImageFormat(normalized.data)).toBe('webp');
    expect(normalized.width).toBe(1568);
    expect(normalized.height).toBe(784);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
  });

  it('rejects a renamed non-image and an oversized payload', async () => {
    await expect(normalizeImage(Buffer.from('not really a png'))).rejects.toThrow(
      'not a valid JPG, PNG, or WebP',
    );
    await expect(normalizeImage(Buffer.alloc(MAX_IMAGE_BYTES + 1))).rejects.toThrow(
      '5 MB or smaller',
    );
  });

  it('enforces the two-image limit at signing and message boundaries', () => {
    const files = Array.from({ length: 3 }, (_, index) => ({
      name: `${index}.png`,
      size: 100,
      type: 'image/png',
    }));
    expect(imageSignRequestSchema.safeParse({ files }).success).toBe(false);
    expect(
      messageRequestSchema.safeParse({
        message: 'inspect these',
        imageIds: files.map((_, index) => `00000000-0000-4000-8000-00000000000${index}`),
      }).success,
    ).toBe(false);
  });
});
