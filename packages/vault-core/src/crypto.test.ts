import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aesKeyUnwrap,
  aesKeyWrap,
  createUnlockEnvelope,
  cryptoCapabilities,
  openSecret,
  sealSecret,
  unwrapVaultMasterKey,
} from "./crypto.ts";
import { randomBytes } from "@noble/hashes/utils.js";

describe("crypto argon2id + AES-KW + AES-GCM", () => {
  it("wraps and unwraps a 32-byte key", () => {
    const kek = randomBytes(32);
    const key = randomBytes(32);
    const wrapped = aesKeyWrap(kek, key);
    const out = aesKeyUnwrap(kek, wrapped);
    assert.equal(out.length, 32);
    assert.deepEqual(Buffer.from(out), Buffer.from(key));
  });

  it("createUnlockEnvelope then unwrap with password", () => {
    const { envelope, vaultMasterKey } = createUnlockEnvelope("test-pass-12");
    assert.equal(envelope.kdf, "argon2id");
    assert.equal(envelope.key_wrap, "AES-KW-256");
    const vmk = unwrapVaultMasterKey(envelope, "test-pass-12");
    assert.deepEqual(Buffer.from(vmk), Buffer.from(vaultMasterKey));
  });

  it("rejects bad password", () => {
    const { envelope } = createUnlockEnvelope("test-pass-12");
    assert.throws(() => unwrapVaultMasterKey(envelope, "wrong-password"));
  });

  it("seals and opens a secret payload", async () => {
    const { vaultMasterKey } = createUnlockEnvelope("test-pass-12");
    const sealed = await sealSecret({
      vmk: vaultMasterKey,
      metadata: { label: "demo", type: "api_key" },
      payload: { secret: "sk-test-value" },
    });
    assert.equal(sealed.format, "hecksec.vault.secret");
    const opened = await openSecret(vaultMasterKey, sealed);
    assert.equal(opened.payload.secret, "sk-test-value");
    assert.equal(opened.metadata.label, "demo");
  });

  it("reports capabilities", () => {
    const caps = cryptoCapabilities();
    assert.equal(caps.unlock_kdf, "argon2id");
    assert.equal(caps.available, true);
  });
});
