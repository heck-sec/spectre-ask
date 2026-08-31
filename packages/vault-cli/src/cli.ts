#!/usr/bin/env node
/**
 * spectre-vault — local CLI over vault-core (sqlite adapter by default).
 * Usage:
 *   spectre-vault health
 *   spectre-vault features-demo
 */

import {
  createSqliteAdapter,
  resolveFeatures,
  runAdapterTestKit,
  type FeatureDef,
} from "@spectre-ask/vault-core";

const [, , cmd = "help", ...rest] = process.argv;

async function main() {
  switch (cmd) {
    case "health": {
      console.log(JSON.stringify({ ok: true, service: "spectre-vault-cli", version: "0.1.0" }));
      return;
    }
    case "adapter-test": {
      const adapter = createSqliteAdapter({ path: rest[0] });
      await runAdapterTestKit(adapter);
      console.log(JSON.stringify({ ok: true, adapter: "sqlite" }));
      return;
    }
    case "features-demo": {
      const defs: FeatureDef[] = [
        { key: "secrets.max_count", valueType: "integer", defaultValue: { int: 25 } },
        { key: "api.custom_endpoints", valueType: "boolean", defaultValue: { bool: false } },
      ];
      const effective = resolveFeatures({
        featureDefs: defs,
        tierFeatures: {
          "secrets.max_count": { int: 5000 },
          "api.custom_endpoints": { bool: true },
        },
        grantOverrides: { "secrets.max_count": { int: 9000 } },
        tenantCeiling: {
          "secrets.max_count": { int: 500 },
          "api.custom_endpoints": { bool: true },
        },
      });
      console.log(JSON.stringify({ effective }, null, 2));
      return;
    }
    case "help":
    default: {
      console.log(`spectre-vault <command>

Commands:
  health          Print CLI health JSON
  adapter-test    Run StorageAdapter contract kit (sqlite memory)
  features-demo   Show defaults → tier → overrides → ceiling clamp
  help            This message
`);
      if (cmd !== "help") process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
