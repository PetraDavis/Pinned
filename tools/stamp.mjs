// Run before each commit that changes src/ or css: node tools/stamp.mjs (cache-busts module URLs for GitHub Pages).
// Cache-busting for the GitHub Pages copy (index.html loads src/*.js as separate modules).
// Pages lets browsers keep each file for a while, so right after a push a player could run a
// mix of old and new modules. This writes a content hash onto every module URL through the
// import map (an import map also remaps relative imports between modules), the module
// preloads, the entry script and the stylesheets, so each push is loaded as one consistent set.
// Usage: node tools/stamp.mjs   (run before committing; build.mjs is unaffected)
import fs from 'fs'; import path from 'path'; import crypto from 'crypto'; import { fileURLToPath } from 'url';
const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = f => crypto.createHash('sha1').update(fs.readFileSync(path.join(R, f))).digest('hex').slice(0, 10);
const walk = d => fs.readdirSync(path.join(R, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : e.name.endsWith('.js') ? [d + '/' + e.name] : []);
const mods = walk('src').sort();
let html = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
const imports = { three: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js', 'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/' };
for (const m of mods) imports['./' + m] = './' + m + '?v=' + hash(m);
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">\n${JSON.stringify({ imports }, null, 0).replace(/","/g, '",\n  "')}\n</script>`);
html = html.replace(/<link rel="modulepreload" href="(src\/[^"?]+)(\?v=[0-9a-f]+)?">/g, (_, f) => `<link rel="modulepreload" href="${f}?v=${hash(f)}">`);
html = html.replace(/<script type="module" src="(src\/[^"?]+)(\?v=[0-9a-f]+)?"><\/script>/, (_, f) => `<script type="module" src="${f}?v=${hash(f)}"></script>`);
html = html.replace(/<link rel="stylesheet" href="(style\.css|src\/net\/net\.css)(\?v=[0-9a-f]+)?">/g, (_, f) => `<link rel="stylesheet" href="${f}?v=${hash(f)}">`);
fs.writeFileSync(path.join(R, 'index.html'), html);
console.log('stamped', mods.length, 'modules');
