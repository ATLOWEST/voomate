import { z } from 'zod';
import { containsSensitiveCredential } from './security.js';

const MAX_METADATA_BYTES = 16 * 1024;

const httpUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
    message: 'sourceUrl must use http or https.',
  });

export const connectMetadataSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    sourceUrl: httpUrl.optional(),
    language: z.string().trim().min(2).max(35).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_METADATA_BYTES) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `metadata must be ${String(MAX_METADATA_BYTES)} bytes or smaller.`,
      });
    }
  });

export const connectSyncItemSchema = z
  .object({
    type: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z][A-Za-z0-9._-]*$/, 'type must be a short descriptive slug.'),
    id: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/,
        'id may contain letters, numbers, dots, underscores, colons, slashes, and hyphens.',
      ),
    content: z
      .string()
      .trim()
      .min(1, 'content cannot be empty.')
      .max(200_000, 'content must be 200,000 characters or smaller.'),
    metadata: connectMetadataSchema.optional().default({}),
  })
  .strict()
  .superRefine((value, context) => {
    if (containsSensitiveCredential(value.content)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content'],
        message: 'content appears to contain a credential and was rejected.',
      });
    }
    if (containsSensitiveCredential(JSON.stringify(value.metadata))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['metadata'],
        message: 'metadata appears to contain a credential and was rejected.',
      });
    }
  });

const batchSchema = z
  .object({
    items: z.array(connectSyncItemSchema).min(1).max(100),
  })
  .strict();

export const connectSyncRequestSchema = z
  .union([connectSyncItemSchema, batchSchema])
  .transform((value) => ('items' in value ? value.items : [value]));

export type ConnectSyncItem = z.infer<typeof connectSyncItemSchema>;
