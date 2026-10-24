import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// AES-256-GCM envelope for stored AI keys. The master secret comes from Secret Manager
// (KEY_ENCRYPTION_KEY). Additional authenticated data binds each ciphertext to its owner and
// provider, so an encrypted key can't be copied onto another account.

export interface Sealed {
  v: 1;
  iv: string;
  tag: string;
  data: string;
}

function keyFrom(secret: string): Buffer {
  if (!secret || secret.length < 32) throw new Error('KEY_ENCRYPTION_KEY is missing or too short');
  return createHash('sha256').update(secret).digest();
}

export function seal(plaintext: string, secret: string, aad: string): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  cipher.setAAD(Buffer.from(aad));
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

export function unseal(sealed: Sealed, secret: string, aad: string): string {
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(sealed.iv, 'base64'));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(sealed.data, 'base64')), decipher.final()]).toString('utf8');
}

/** Random URL-safe token (API tokens, OAuth codes). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Human-friendly invite code like "KX4P-9QTZ" (no 0/O/1/I). */
export function inviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i++) s += alphabet[bytes[i]! % alphabet.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
