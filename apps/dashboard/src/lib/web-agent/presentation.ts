export type PresentationBlock =
  | { type: 'text'; text: string }
  | { type: 'list'; style: 'bullet' | 'number'; items: string[] }
  | {
      type: 'entity_card';
      entity: 'product' | 'service' | 'appointment';
      title: string;
      subtitle?: string;
      imageUrl?: string;
      price?: string;
      href?: string;
      fields?: Array<{ label: string; value: string }>;
    };

export interface ResponsePresentation {
  version: 1;
  blocks: PresentationBlock[];
}

const TITLE_KEYS = ['name', 'title', 'productName', 'serviceName'];
const IMAGE_KEYS = ['imageUrl', 'image_url', 'image', 'thumbnail', 'thumbnailUrl'];
const PRICE_KEYS = ['formattedPrice', 'price', 'amount'];
const URL_KEYS = ['url', 'href', 'productUrl', 'bookingUrl'];

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function firstString(value: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 500);
  }
  return undefined;
}

function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, 'http://localhost');
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function formatPrice(value: Record<string, unknown>): string | undefined {
  const price = PRICE_KEYS.map((key) => value[key]).find(
    (candidate) => typeof candidate === 'string' || typeof candidate === 'number',
  );
  if (price === undefined) return undefined;
  if (typeof price === 'string') return price.trim().slice(0, 80);
  const currency = typeof value.currency === 'string' ? value.currency.toUpperCase() : undefined;
  if (!currency) return String(price);
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

function entityCard(value: Record<string, unknown>): PresentationBlock | undefined {
  const title = firstString(value, TITLE_KEYS);
  if (!title) return undefined;
  const imageUrl = safeUrl(firstString(value, IMAGE_KEYS));
  const price = formatPrice(value);
  const duration = firstString(value, ['duration', 'durationText']);
  const start = firstString(value, ['start', 'startTime', 'dateTime', 'time']);
  const appointmentSignal = Boolean(start && (value.available !== undefined || value.endTime));
  const productSignal = Boolean(price && (imageUrl || value.sku || value.inventory !== undefined));
  const serviceSignal = Boolean(duration && (price || value.available !== undefined));
  if (!appointmentSignal && !productSignal && !serviceSignal) return undefined;

  const entity = appointmentSignal ? 'appointment' : serviceSignal ? 'service' : 'product';
  const fields: Array<{ label: string; value: string }> = [];
  const availability = value.availability ?? value.inventory ?? value.available;
  if (availability !== undefined) {
    fields.push({
      label: 'Availability',
      value:
        typeof availability === 'boolean'
          ? availability
            ? 'Available'
            : 'Unavailable'
          : String(availability),
    });
  }
  if (duration) fields.push({ label: 'Duration', value: duration });
  if (start) fields.push({ label: 'Time', value: start });

  return {
    type: 'entity_card',
    entity,
    title,
    subtitle: firstString(value, ['subtitle', 'description', 'category']),
    imageUrl,
    price,
    href: safeUrl(firstString(value, URL_KEYS)),
    fields: fields.length ? fields.slice(0, 3) : undefined,
  };
}

function collectRecords(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 3) return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectRecords(item, depth + 1));
  const item = record(value);
  if (!item) return [];
  const records = [item];
  for (const key of ['items', 'results', 'products', 'services', 'slots', 'data']) {
    if (key in item) records.push(...collectRecords(item[key], depth + 1));
  }
  return records;
}

function textBlocks(text: string): PresentationBlock[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: PresentationBlock[] = [];
  let list: { style: 'bullet' | 'number'; items: string[] } | undefined;
  const flushList = () => {
    if (list?.items.length) blocks.push({ type: 'list', ...list });
    list = undefined;
  };
  for (const line of lines) {
    const match = line.match(/^((?:\d+[.)])|[-*•])\s+(.+)$/);
    if (match) {
      const style = /^\d/.test(match[1] ?? '') ? 'number' : 'bullet';
      if (list && list.style !== style) flushList();
      list ??= { style, items: [] };
      list.items.push((match[2] ?? '').slice(0, 500));
      continue;
    }
    flushList();
    const sentences = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()) ?? [line];
    if (line.length > 240 && sentences.length > 1) {
      for (let index = 0; index < sentences.length; index += 2) {
        blocks.push({
          type: 'text',
          text: sentences
            .slice(index, index + 2)
            .join(' ')
            .slice(0, 700),
        });
      }
    } else {
      blocks.push({ type: 'text', text: line.slice(0, 700) });
    }
  }
  flushList();
  return blocks;
}

export function buildResponsePresentation(
  text: string,
  structuredResults: readonly unknown[] = [],
): ResponsePresentation {
  const cards = structuredResults
    .flatMap((value) => collectRecords(value))
    .map(entityCard)
    .filter((value): value is PresentationBlock => Boolean(value));
  const uniqueCards = cards.filter(
    (card, index) =>
      card.type === 'entity_card' &&
      cards.findIndex(
        (candidate) =>
          candidate.type === 'entity_card' &&
          candidate.entity === card.entity &&
          candidate.title === card.title,
      ) === index,
  );
  return { version: 1, blocks: [...textBlocks(text), ...uniqueCards].slice(0, 12) };
}
