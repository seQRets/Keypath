// Bundles src/lib.js with esbuild, then assembles src/{app.html,style.css,body.html,app.js}
// into one self-contained file: dist/index.html
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const r = await build({
  entryPoints: ['src/lib.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'BTC',
  target: ['es2020'],
  write: false,
  legalComments: 'none',
});
const esc = (s) => s.replace(/<\/script/gi, '<\\/script');
const lib = r.outputFiles[0].text;
const css = readFileSync('src/style.css', 'utf8');
const body = readFileSync('src/body.html', 'utf8');
const app = readFileSync('src/glossary.js', 'utf8') + '\n' + readFileSync('src/app.js', 'utf8');
let html = readFileSync('src/app.html', 'utf8');
for (const [marker, val] of [['/*__CSS__*/', css], ['<!--__BODY__-->', body], ['/*__LIB__*/', esc(lib)], ['/*__APP__*/', esc(app)]]) {
  if (!html.includes(marker)) throw new Error('marker missing: ' + marker);
  html = html.replace(marker, () => val);
}
// Content Security Policy: allow exactly the inline scripts this build produced, by hash.
// Any other script (injected or tampered) is refused by the browser.
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const hashes = scripts.map((t) => "'sha256-" + createHash('sha256').update(t, 'utf8').digest('base64') + "'").join(' ');
html = html.replace("script-src 'unsafe-inline'", 'script-src ' + hashes);
if (!html.includes(hashes)) throw new Error('CSP hash injection failed');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
const fileHash = createHash('sha256').update(html, 'utf8').digest('hex');
writeFileSync('dist/index.html.sha256', `${fileHash}  index.html\n`);
console.log(`SHA-256 ${fileHash}`);
writeFileSync('dist/lib.bundle.js', lib);
console.log(`lib ${(lib.length/1024).toFixed(0)} KB, page ${(html.length/1024).toFixed(0)} KB -> dist/index.html`);
