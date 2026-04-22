#!/usr/bin/env node
/**
 * SFX auditioner server — tiny Node HTTP + file-system bridge.
 *
 * Serves:
 *   GET  /                → auditioner/index.html
 *   GET  /audio/<path>    → public/assets/sfx/<path>  (raw MP3s for <audio>)
 *   GET  /api/manifest    → MANIFEST.json
 *   PATCH /api/item/:id   → merge partial updates into the matching item,
 *                           write MANIFEST, regenerate LIBRARY.md
 *
 * No deps beyond Node stdlib. Launches on port 4747 (SFX on a dial pad).
 *
 * Usage:
 *   node scripts/sfx/auditioner/server.mjs
 *   npm run audition      # once package.json script is wired
 */
import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..');
const MANIFEST_PATH = join(PROJECT_ROOT, 'public/assets/sfx/MANIFEST.json');
const SFX_ROOT = join(PROJECT_ROOT, 'public/assets/sfx');
const INDEX_HTML = join(__dirname, 'index.html');
const PORT = Number(process.env.AUDITIONER_PORT || 4747);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

let manifestLock = Promise.resolve();
async function withManifestLock(fn) {
  const prev = manifestLock;
  let release;
  manifestLock = new Promise(r => { release = r; });
  await prev;
  try { return await fn(); } finally { release(); }
}

async function readManifest() {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeManifest(data) {
  await writeFile(MANIFEST_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function regenerateLibraryMd() {
  return new Promise((res, rej) => {
    const p = spawn('node', [join(__dirname, '..', 'render-library-md.mjs')], { cwd: PROJECT_ROOT });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('close', code => code === 0 ? res() : rej(new Error(`render-library-md ${code}: ${err}`)));
  });
}

async function serveFile(res, filePath, contentType) {
  try {
    const s = await stat(filePath);
    if (!s.isFile()) { res.writeHead(404); return res.end('not found'); }
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': body.length });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const { pathname } = url;

    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      return serveFile(res, INDEX_HTML, MIME['.html']);
    }

    if (req.method === 'GET' && pathname.startsWith('/audio/')) {
      const rel = decodeURIComponent(pathname.slice('/audio/'.length));
      const filePath = normalize(join(SFX_ROOT, rel));
      if (!filePath.startsWith(SFX_ROOT)) { res.writeHead(403); return res.end('forbidden'); }
      return serveFile(res, filePath, MIME[extname(filePath).toLowerCase()] || 'application/octet-stream');
    }

    if (req.method === 'GET' && pathname === '/api/manifest') {
      const data = await readManifest();
      return json(res, 200, data);
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/item/')) {
      const id = decodeURIComponent(pathname.slice('/api/item/'.length));
      const patch = await readBody(req);
      const result = await withManifestLock(async () => {
        const data = await readManifest();
        const item = (data.items || []).find(i => i.id === id);
        if (!item) return { ok: false, reason: 'not_found' };
        // Approval toggle records a timestamp so we can audit when Danny signed off
        if (patch.approved !== undefined && patch.approved !== item.approved) {
          item.approved_at = patch.approved ? new Date().toISOString() : null;
        }
        Object.assign(item, patch);
        await writeManifest(data);
        return { ok: true, item };
      });
      if (result.ok) {
        regenerateLibraryMd().catch(e => console.error('render-library-md failed:', e.message));
      }
      return json(res, result.ok ? 200 : 404, result);
    }

    res.writeHead(404); res.end('not found');
  } catch (e) {
    console.error(e);
    json(res, 500, { ok: false, error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`SFX auditioner running on http://localhost:${PORT}`);
  console.log(`  manifest: ${MANIFEST_PATH}`);
  console.log(`  audio:    ${SFX_ROOT}`);
  console.log(`  Ctrl+C to stop.`);
});
