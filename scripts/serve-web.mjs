// Serves the web app's build the way Vercel does, with the rewrites and headers of its vercel.json (sibling repo), so
// the E2E tests run under the production headers, Content-Security-Policy included.
// Usage: node scripts/serve-web.mjs <build dir> <port> ["<extra connect-src origins>"]
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [dir, port, extraOrigins = ''] = process.argv.slice(2);
const root = resolve(dir);
const vercel = JSON.parse(await readFile(fileURLToPath(new URL('../../spin-trainer-web/vercel.json', import.meta.url)), 'utf8'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// Vercel sources are path-to-regexp patterns; the ones in vercel.json are also valid regular expressions.
const matches = (source, path) => new RegExp(`^${source}$`).test(path);

function headersFor(path) {
  const headers = {};
  for (const rule of vercel.headers.filter((r) => matches(r.source, path))) {
    for (const { key, value } of rule.headers) headers[key] = value;
  }
  // connect-src is the only environment-specific directive: the QA environment adds its API and JWT issuer.
  const csp = headers['Content-Security-Policy'];
  if (csp && extraOrigins) headers['Content-Security-Policy'] = csp.replace('connect-src', `connect-src ${extraOrigins}`);
  return headers;
}

async function fileFor(path) {
  const file = join(root, normalize(path));
  if (!file.startsWith(root)) return null;
  try {
    return (await stat(file)).isFile() ? file : null;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  // Like Vercel: an existing file first, then the rewrites (the SPA fallback leaves /assets/ out, so a missing chunk is a 404).
  let file = await fileFor(path);
  const rewrite = file ? null : vercel.rewrites.find((r) => matches(r.source, path));
  if (rewrite) file = await fileFor(rewrite.destination);

  const headers = headersFor(path);
  if (!file) {
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(Number(port), () => console.log(`web on http://localhost:${port} (${root})`));
