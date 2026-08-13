import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { env } from '../config/env.ts';

/**
 * AES-256-GCM encryption for GitHub access tokens at rest.
 *
 * The token is never stored in plaintext and is never returned to the client.
 * We derive a 32-byte key from TOKEN_ENCRYPTION_KEY (64 hex chars) if provided,
 * otherwise from SESSION_SECRET via SHA-256 so the app still works out of the box.
 *
 * Stored format (base64): iv(12) | authTag(16) | ciphertext
 */

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(): Buffer {
  const raw = env.TOKEN_ENCRYPTION_KEY?.trim();
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    // Not 32-byte hex — hash whatever was given down to 32 bytes.
    return createHash('sha256').update(raw).digest();
  }
  return createHash('sha256').update(env.SESSION_SECRET).digest();
}

const KEY = deriveKey();

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    'utf8',
  );
}
