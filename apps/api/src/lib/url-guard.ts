/**
 * SSRF guard for merchant-supplied URLs.
 *
 * The crawler fetches these server-side from inside our VPC. An unchecked URL lets a
 * merchant point us at `http://169.254.169.254/` (EC2 instance metadata → IAM credentials),
 * at internal services, or at `localhost`. This is the classic path from "user supplies a
 * URL" to "attacker holds our AWS keys".
 *
 * Two properties matter:
 *
 *  1. Resolve DNS and check the resulting **IP**, not the hostname. `evil.com` can have an
 *     A record pointing at 127.0.0.1, so a hostname denylist catches nothing.
 *  2. Re-check at fetch time, not only at registration. DNS answers change between the two
 *     (DNS rebinding), so a URL that passed here can resolve elsewhere minutes later. The
 *     crawler must call this again immediately before it fetches.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { AppError, ErrorCode } from '@voomate/core';
import { isProduction } from '../config.js';

const BLOCKED_PORTS = new Set([22, 23, 25, 445, 3306, 5432, 6379, 9200, 11211, 27017]);

/** True for loopback, link-local, and RFC1918 / RFC4193 private ranges. */
const isPrivateAddress = (address: string): boolean => {
  const version = isIP(address);

  if (version === 4) {
    const parts = address.split('.').map(Number);
    const [a = 0, b = 0] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // "this network"
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // link-local — includes IMDS at 169.254.169.254
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a >= 224) return true; // multicast and reserved
    return false;
  }

  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA
    if (normalized.startsWith('fe80')) return true; // link-local
    // IPv4-mapped (::ffff:127.0.0.1) — unwrap and re-check, or the guard is trivially bypassed.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    return false;
  }

  // Unparseable: fail closed.
  return true;
};

const reject = (message: string): never => {
  throw new AppError(ErrorCode.VALIDATION_FAILED, message);
};

/**
 * Throws unless the URL is safe for the crawler to fetch.
 *
 * Private-address checks are skipped outside production so developers can crawl a local
 * test site. That exemption must never apply in production, which is why it keys off
 * `isProduction` rather than an env flag someone could set by accident.
 */
export const assertCrawlableUrl = async (value: string): Promise<void> => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return reject('Not a valid URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return reject('Only http and https URLs can be crawled.');
  }

  if (url.username !== '' || url.password !== '') {
    return reject('URLs with embedded credentials are not allowed.');
  }

  const port = url.port === '' ? (url.protocol === 'https:' ? 443 : 80) : Number(url.port);
  if (BLOCKED_PORTS.has(port)) {
    return reject(`Port ${port} is not allowed.`);
  }

  if (!isProduction) return;

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch {
    return reject(`Could not resolve ${url.hostname}.`);
  }

  if (addresses.length === 0) {
    return reject(`Could not resolve ${url.hostname}.`);
  }

  // ALL resolved addresses must be public. If any is private, a round-robin DNS answer
  // could land the crawler on the private one.
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      return reject('That host resolves to a private network address and cannot be crawled.');
    }
  }
};

export const __testing = { isPrivateAddress };
