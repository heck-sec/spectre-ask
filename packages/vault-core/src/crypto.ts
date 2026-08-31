/**
 * Vault crypto — port of vault-v2/runtime/crypto.py hierarchy:
 *   Master Password → Argon2id → KEK → AES-KW unwrap Vault Master Key
 *   → per-record DEK (AES-KW) → AES-256-GCM payload
 *
 * Defaults match Python: memory 65536 KiB, time 3, parallelism 1.
 * Uses @noble/hashes (argon2id) + Web Crypto AES-GCM + RFC 3394 AES-KW.
 */

import { createCipheriv, createDecipheriv } from "node:crypto";
import { argon2id } from "@noble/hashes/argon2.js";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils.js";

export const UNLOCK_FORMAT = "hecksec.vault.unlock" as const;
export const UNLOCK_VERSION = 1 as const;
export const SECRET_ENVELOPE_FORMAT = "hecksec.vault.secret" as const;
export const SECRET_ENVELOPE_VERSION = 1 as const;

export const DEFAULT_MEMORY_KIB = 65536;
export const DEFAULT_TIME_COST = 3;
export const DEFAULT_PARALLELISM = 1;
export const SESSION_TTL_SECONDS = 30 * 60;

export type UnlockEnvelope = {
  format: typeof UNLOCK_FORMAT;
  version: typeof UNLOCK_VERSION;
  kdf: "argon2id";
  salt: string;
  memory: number;
  iterations: number;
  parallelism: number;
  key_wrap: "AES-KW-256";
  wrapped_vault_master_key: string;
  created_at: string;
  upgraded_from_version: null;
};

export type EncryptedBlob = {
  wrapped_dek: string;
  iv: string;
  ciphertext: string;
};

export type SecretEnvelope = {
  format: typeof SECRET_ENVELOPE_FORMAT;
  version: typeof SECRET_ENVELOPE_VERSION;
  id: string;
  classification: "secret";
  encryption_version: 1;
  metadata: Record<string, unknown>;
  encrypted: EncryptedBlob;
  created_at: string;
  updated_at: string;
};

function b64e(data: Uint8Array): string {
  return Buffer.from(data).toString("base64");
}

function b64d(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** RFC 3394 AES Key Wrap (256-bit KEK / 256-bit key). */
export function aesKeyWrap(kek: Uint8Array, plaintext: Uint8Array): Uint8Array {
  if (kek.length !== 32) throw new Error("AES-KW requires 256-bit KEK");
  if (plaintext.length % 8 !== 0 || plaintext.length < 16) {
    throw new Error("AES-KW plaintext must be multiple of 8 bytes and >= 16");
  }
  // Use Web Crypto subtle via sync-ish path — Node has createCipheriv for AES-ECB
  const n = plaintext.length / 8;
  const A = new Uint8Array(8);
  A.set([0xa6, 0xa6, 0xa6, 0xa6, 0xa6, 0xa6, 0xa6, 0xa6]);
  const R: Uint8Array[] = [];
  for (let i = 0; i < n; i++) R.push(plaintext.slice(i * 8, i * 8 + 8));

  for (let j = 0; j <= 5; j++) {
    for (let i = 1; i <= n; i++) {
      const block = new Uint8Array(16);
      block.set(A);
      block.set(R[i - 1]!, 8);
      const cipher = createCipheriv("aes-256-ecb", Buffer.from(kek), null);
      cipher.setAutoPadding(false);
      const B = new Uint8Array(Buffer.concat([cipher.update(Buffer.from(block)), cipher.final()]));
      const t = n * j + i;
      A.set(B.slice(0, 8));
      A[7]! ^= t & 0xff;
      A[6]! ^= (t >>> 8) & 0xff;
      A[5]! ^= (t >>> 16) & 0xff;
      A[4]! ^= (t >>> 24) & 0xff;
      R[i - 1] = B.slice(8, 16);
    }
  }
  const out = new Uint8Array(8 + n * 8);
  out.set(A);
  for (let i = 0; i < n; i++) out.set(R[i]!, 8 + i * 8);
  return out;
}

export function aesKeyUnwrap(kek: Uint8Array, wrapped: Uint8Array): Uint8Array {
  if (kek.length !== 32) throw new Error("AES-KW requires 256-bit KEK");
  if (wrapped.length % 8 !== 0 || wrapped.length < 24) {
    throw new Error("AES-KW ciphertext invalid length");
  }
  const n = wrapped.length / 8 - 1;
  const A = wrapped.slice(0, 8);
  const R: Uint8Array[] = [];
  for (let i = 0; i < n; i++) R.push(wrapped.slice(8 + i * 8, 16 + i * 8));

  for (let j = 5; j >= 0; j--) {
    for (let i = n; i >= 1; i--) {
      const t = n * j + i;
      const At = new Uint8Array(A);
      At[7]! ^= t & 0xff;
      At[6]! ^= (t >>> 8) & 0xff;
      At[5]! ^= (t >>> 16) & 0xff;
      At[4]! ^= (t >>> 24) & 0xff;
      const block = new Uint8Array(16);
      block.set(At);
      block.set(R[i - 1]!, 8);
      const decipher = createDecipheriv("aes-256-ecb", Buffer.from(kek), null);
      decipher.setAutoPadding(false);
      const B = new Uint8Array(
        Buffer.concat([decipher.update(Buffer.from(block)), decipher.final()])
      );
      A.set(B.slice(0, 8));
      R[i - 1] = B.slice(8, 16);
    }
  }
  const ivOk = A.every((b) => b === 0xa6);
  if (!ivOk) throw new Error("AES-KW integrity check failed");
  const out = new Uint8Array(n * 8);
  for (let i = 0; i < n; i++) out.set(R[i]!, i * 8);
  return out;
}

export function deriveKek(
  password: string,
  salt: Uint8Array,
  memoryKiB = DEFAULT_MEMORY_KIB,
  iterations = DEFAULT_TIME_COST,
  parallelism = DEFAULT_PARALLELISM
): Uint8Array {
  return argon2id(password, salt, {
    t: iterations,
    m: memoryKiB,
    p: parallelism,
    dkLen: 32,
  });
}

export function createUnlockEnvelope(password: string): {
  envelope: UnlockEnvelope;
  vaultMasterKey: Uint8Array;
} {
  if (!password || password.length < 8) {
    throw new Error("password must be at least 8 characters");
  }
  const salt = randomBytes(16);
  const vmk = randomBytes(32);
  const kek = deriveKek(password, salt);
  const wrapped = aesKeyWrap(kek, vmk);
  const envelope: UnlockEnvelope = {
    format: UNLOCK_FORMAT,
    version: UNLOCK_VERSION,
    kdf: "argon2id",
    salt: b64e(salt),
    memory: DEFAULT_MEMORY_KIB,
    iterations: DEFAULT_TIME_COST,
    parallelism: DEFAULT_PARALLELISM,
    key_wrap: "AES-KW-256",
    wrapped_vault_master_key: b64e(wrapped),
    created_at: nowIso(),
    upgraded_from_version: null,
  };
  return { envelope, vaultMasterKey: vmk };
}

export function unwrapVaultMasterKey(envelope: UnlockEnvelope, password: string): Uint8Array {
  const salt = b64d(envelope.salt);
  const kek = deriveKek(
    password,
    salt,
    envelope.memory,
    envelope.iterations,
    envelope.parallelism
  );
  try {
    return aesKeyUnwrap(kek, b64d(envelope.wrapped_vault_master_key));
  } catch (err) {
    throw new Error("invalid password", { cause: err });
  }
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function aesGcmEncrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  iv: Uint8Array,
  aad: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    asBufferSource(key),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBufferSource(iv), additionalData: asBufferSource(aad) },
    cryptoKey,
    asBufferSource(plaintext)
  );
  return new Uint8Array(ct);
}

async function aesGcmDecrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array,
  aad: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    asBufferSource(key),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBufferSource(iv), additionalData: asBufferSource(aad) },
    cryptoKey,
    asBufferSource(ciphertext)
  );
  return new Uint8Array(pt);
}

export async function encryptPayload(
  vmk: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array
): Promise<EncryptedBlob> {
  const dek = randomBytes(32);
  const wrappedDek = aesKeyWrap(vmk, dek);
  const iv = randomBytes(12);
  const ciphertext = await aesGcmEncrypt(dek, plaintext, iv, aad);
  dek.fill(0);
  return {
    wrapped_dek: b64e(wrappedDek),
    iv: b64e(iv),
    ciphertext: b64e(ciphertext),
  };
}

export async function decryptPayload(
  vmk: Uint8Array,
  blob: EncryptedBlob,
  aad: Uint8Array
): Promise<Uint8Array> {
  const dek = aesKeyUnwrap(vmk, b64d(blob.wrapped_dek));
  try {
    return await aesGcmDecrypt(dek, b64d(blob.ciphertext), b64d(blob.iv), aad);
  } finally {
    dek.fill(0);
  }
}

export async function sealSecret(input: {
  vmk: Uint8Array;
  secretId?: string;
  metadata: Record<string, unknown>;
  payload: Record<string, unknown>;
}): Promise<SecretEnvelope> {
  const id = input.secretId ?? `vsec_${bytesToHex(randomBytes(8))}`;
  const aad = new TextEncoder().encode(id);
  const encrypted = await encryptPayload(
    input.vmk,
    new TextEncoder().encode(JSON.stringify(input.payload)),
    aad
  );
  const now = nowIso();
  return {
    format: SECRET_ENVELOPE_FORMAT,
    version: SECRET_ENVELOPE_VERSION,
    id,
    classification: "secret",
    encryption_version: 1,
    metadata: {
      label: (input.metadata.label as string) || (input.metadata.title as string) || "(untitled)",
      type: (input.metadata.type as string) || "password",
      origin: input.metadata.origin ?? null,
      username: input.metadata.username ?? null,
      email: input.metadata.email ?? null,
      project: input.metadata.project ?? null,
      tags: input.metadata.tags ?? [],
      modified: now,
    },
    encrypted,
    created_at: (input.metadata.created_at as string) || now,
    updated_at: now,
  };
}

export async function openSecret(
  vmk: Uint8Array,
  envelope: SecretEnvelope
): Promise<{ id: string; metadata: Record<string, unknown>; payload: Record<string, unknown> }> {
  const aad = new TextEncoder().encode(envelope.id);
  const plaintext = await decryptPayload(vmk, envelope.encrypted, aad);
  const payload = JSON.parse(new TextDecoder().decode(plaintext)) as Record<string, unknown>;
  return { id: envelope.id, metadata: envelope.metadata, payload };
}

export function cryptoCapabilities() {
  return {
    unlock_kdf: "argon2id",
    key_wrap: "AES-KW-256",
    payload_cipher: "AES-GCM-256",
    hierarchy: "password->argon2id->kek->vault-master-key->deks",
    memory_kib: DEFAULT_MEMORY_KIB,
    time_cost: DEFAULT_TIME_COST,
    parallelism: DEFAULT_PARALLELISM,
    available: true,
  };
}

/** Test helper — hex roundtrip identity */
export function _testOnlyHex(bytes: Uint8Array): string {
  return bytesToHex(bytes);
}
export function _testOnlyFromHex(hex: string): Uint8Array {
  return hexToBytes(hex);
}
