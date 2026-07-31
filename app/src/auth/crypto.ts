/** Hash de senha com WebCrypto PBKDF2-SHA256. A senha nunca é armazenada. */

export const PBKDF2_ITERATIONS = 310_000
const HASH_BITS = 256
const SALT_BYTES = 16

export type PasswordCredentials = {
  algorithm: 'PBKDF2-SHA256'
  iterations: number
  saltB64: string
  hashB64: string
}

function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  return btoa(String.fromCharCode(...arr))
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    keyMaterial,
    HASH_BITS,
  )
}

export async function hashPassword(
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<PasswordCredentials> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await deriveBits(password, salt, iterations)
  return {
    algorithm: 'PBKDF2-SHA256',
    iterations,
    saltB64: toB64(salt),
    hashB64: toB64(hash),
  }
}

export async function verifyPassword(
  password: string,
  credentials: PasswordCredentials,
): Promise<boolean> {
  const salt = fromB64(credentials.saltB64)
  const hash = new Uint8Array(await deriveBits(password, salt, credentials.iterations))
  const expected = fromB64(credentials.hashB64)
  if (hash.length !== expected.length) return false
  // comparação em tempo constante
  let diff = 0
  for (let i = 0; i < hash.length; i++) diff |= hash[i] ^ expected[i]
  return diff === 0
}
