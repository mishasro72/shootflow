#!/usr/bin/env node
// Fails when the translation files do not define exactly the same keys,
// or when a value is empty. Run in CI via `pnpm i18n:check`.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Flattens {"A": {"b": "x"}} into ["A.b"], reporting empty values. */
export function flattenKeys(value, prefix = "", empty = []) {
  const keys = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object") {
      keys.push(...flattenKeys(child, path, empty));
    } else {
      if (typeof child !== "string" || child.trim() === "") empty.push(path);
      keys.push(path);
    }
  }
  return keys;
}

export function compareLocales(byLocale) {
  const problems = [];
  const all = new Set(Object.values(byLocale).flatMap((entry) => entry.keys));

  for (const [locale, { keys, empty }] of Object.entries(byLocale)) {
    const own = new Set(keys);
    const missing = [...all].filter((key) => !own.has(key)).sort();
    if (missing.length) problems.push(`${locale}: missing ${missing.join(", ")}`);
    if (empty.length) problems.push(`${locale}: empty ${empty.join(", ")}`);
  }
  return problems;
}

function main() {
  const dir = fileURLToPath(new URL("../messages/", import.meta.url));
  const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
  const byLocale = {};
  for (const file of files) {
    const empty = [];
    const keys = flattenKeys(JSON.parse(readFileSync(join(dir, file), "utf8")), "", empty);
    byLocale[file.replace(/\.json$/, "")] = { keys, empty };
  }

  const problems = compareLocales(byLocale);
  if (problems.length) {
    console.error("Translation files are out of sync:\n" + problems.map((p) => `  - ${p}`).join("\n"));
    process.exit(1);
  }
  const count = Object.values(byLocale)[0]?.keys.length ?? 0;
  console.log(`i18n OK: ${files.length} locales, ${count} keys each.`);
}

if (import.meta.url.startsWith("file:") && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
