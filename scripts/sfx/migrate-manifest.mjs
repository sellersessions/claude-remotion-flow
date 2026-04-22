#!/usr/bin/env node
/**
 * MANIFEST.json schema migration — v1 → v2.
 *
 * v1 fields (scraper capture): id, source, query, category, page, cdn_url,
 * detail_url, title, author, author_url, duration, tags, license,
 * captured_at, local_path, bytes.
 *
 * v2 adds curation fields so the auditioner + LIBRARY.md can do their job:
 *   + subcategory     string|null    finer bucket inside category
 *   + mood            string[]       ["dramatic","playful","tense","calm"]
 *   + bpm             number|null    for music; null for SFX
 *   + key             string|null    for music; null for SFX
 *   + energy          number|null    1–5 manual at curate time
 *   + approved        boolean        Danny's sign-off
 *   + approved_at     string|null    ISO timestamp when approved flipped true
 *   + used_in         string[]       compositions referencing it
 *   + notes           string         free-text notes
 *
 * Idempotent — re-runs leave existing curation untouched.
 *
 * Usage:
 *   node scripts/sfx/migrate-manifest.mjs
 *   node scripts/sfx/migrate-manifest.mjs --dry-run
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const MANIFEST_PATH = resolve(PROJECT_ROOT, 'public/assets/sfx/MANIFEST.json');

const V2_DEFAULTS = {
  subcategory: null,
  mood: [],
  bpm: null,
  key: null,
  energy: null,
  approved: false,
  approved_at: null,
  used_in: [],
  notes: '',
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  const data = JSON.parse(raw);

  const before = data.schema_version;
  let added = 0;
  let touched = 0;

  for (const item of data.items ?? []) {
    let changed = false;
    for (const [k, v] of Object.entries(V2_DEFAULTS)) {
      if (!(k in item)) {
        item[k] = Array.isArray(v) ? [...v] : v;
        added++;
        changed = true;
      }
    }
    if (changed) touched++;
  }

  data.schema_version = 2;

  console.log(`MANIFEST: v${before} → v2`);
  console.log(`  items: ${data.items?.length ?? 0}`);
  console.log(`  touched: ${touched}`);
  console.log(`  fields added: ${added}`);

  if (dryRun) {
    console.log('  --dry-run: not writing');
    return;
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  written: ${MANIFEST_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
