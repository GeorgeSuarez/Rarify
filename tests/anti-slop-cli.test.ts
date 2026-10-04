import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, test } from "vitest";

/**
 * End-to-end checks that the vendored plugins load and report through the real
 * Oxlint CLI, including autofix stability for the readable-spacing rule.
 */
const probeRoot = mkdtempSync(join(tmpdir(), "anti-slop-cli-"));

const oxlintBin = fileURLToPath(
  new URL("../node_modules/oxlint/bin/oxlint", import.meta.url),
);

const genericPlugin = fileURLToPath(
  new URL("../tools/oxlint/anti-slop/index.ts", import.meta.url),
);

const effectPlugin = fileURLToPath(
  new URL("../tools/oxlint/anti-slop/effect/index.ts", import.meta.url),
);

function runOxlint(configPath: string, ...args: string[]) {
  const result = spawnSync(
    process.execPath,
    [oxlintBin, "--config", configPath, ...args],
    { encoding: "utf8" },
  );

  return { status: result.status, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
}

afterAll(() => {
  rmSync(probeRoot, { recursive: true, force: true });
});

test("require-readable-spacing rejects, fixes, and stays stable through the Oxlint CLI", () => {
  const config = join(probeRoot, "spacing.json");
  const first = join(probeRoot, "spacing-first.ts");
  const second = join(probeRoot, "spacing-second.ts");
  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [{ name: "anti-slop", specifier: genericPlugin }],
      rules: { "anti-slop/require-readable-spacing": "error" },
    }),
  );
  writeFileSync(first, "export const a = 1;\n/** Attached to b. */\nexport const b = 2;\n");
  writeFileSync(second, "export function f() {\nconst a = 1;\nconst b = 2;\nreturn a + b;\n}\n");

  const rejected = runOxlint(config, first, second);
  assert.equal(rejected.status, 1, rejected.output);
  assert.match(rejected.output, /require-readable-spacing/);

  const fixed = runOxlint(config, "--fix", first, second);
  assert.equal(fixed.status, 0, fixed.output);
  assert.equal(
    readFileSync(first, "utf8"),
    "export const a = 1;\n\n/** Attached to b. */\nexport const b = 2;\n",
  );
  assert.equal(
    readFileSync(second, "utf8"),
    "export function f() {\nconst a = 1;\nconst b = 2;\n\nreturn a + b;\n}\n",
  );

  const stable = [readFileSync(first, "utf8"), readFileSync(second, "utf8")];
  const clean = runOxlint(config, first, second);
  assert.equal(clean.status, 0, clean.output);
  const repeated = runOxlint(config, "--fix", first, second);
  assert.equal(repeated.status, 0, repeated.output);
  assert.deepEqual([readFileSync(first, "utf8"), readFileSync(second, "utf8")], stable);
});

test("anti-slop-effect reports through the Oxlint CLI", () => {
  const config = join(probeRoot, "effect.json");
  const probe = join(probeRoot, "effect-probe.ts");
  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [{ name: "anti-slop-effect", specifier: effectPlugin }],
      rules: { "anti-slop-effect/no-manual-tag-comparison": "error" },
    }),
  );
  writeFileSync(
    probe,
    'export function isReady(value: { _tag: string }): boolean {\n  return value._tag === "Ready";\n}\n',
  );

  const result = runOxlint(config, probe);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /no-manual-tag-comparison/);
});
