// npm run publish-prep: build, then write publish/ for hosting as a body-only
// page: publish/index.html holds the title, a little inline style, the
// stylesheet and module script (relative ./assets/ paths) and the #app
// markup, with no doctype, html, head or body tags (the host wraps it).
// The built assets are copied beside it, and every published path is listed.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve('.');
const dist = join(root, 'dist');
const out = join(root, 'publish');

execSync('npm run build', { stdio: 'inherit' });

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
const styles = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
const preloads = [...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
const app = html.match(/<div id="app">[\s\S]*?<\/div>\s*<\/div>|<div id="app">[\s\S]*?<\/div>(?=\s*<script)/)?.[0];
if (!scripts.length || !app) throw new Error('publish-prep: could not find the module script or the #app markup in dist/index.html');
const rel = (p) => (p.startsWith('./') ? p : `./${p.replace(/^\//, '')}`);
const title = 'Zeus Remake';

const body = [
  `<title>${title}</title>`,
  '<style>html,body{height:100%;margin:0;overflow:hidden;background:#cfe4ee}</style>',
  ...styles.map((h) => `<link rel="stylesheet" href="${rel(h)}">`),
  ...preloads.map((h) => `<link rel="modulepreload" href="${rel(h)}">`),
  ...scripts.map((s) => `<script type="module" src="${rel(s)}"></script>`),
  app.trim(),
  '',
].join('\n');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), body);
if (existsSync(join(dist, 'assets'))) cpSync(join(dist, 'assets'), join(out, 'assets'), { recursive: true });

const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(out);
console.log(`\nWrote ${relative(root, out)}/ (body-only page; the host adds the document around it):`);
for (const f of files.sort()) console.log(`  ${relative(out, f)}  ${(statSync(f).size / 1024).toFixed(1)} KB`);
console.log('\nAsset paths to publish beside index.html:');
for (const f of files.filter((f) => !f.endsWith('index.html'))) console.log(`  ${relative(out, f)}`);
