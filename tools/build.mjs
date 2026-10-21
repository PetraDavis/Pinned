// Builds one self-contained HTML file (JS bundled with three@0.160.0, CSS inlined).
// Usage: cd tools && npm install && node build.mjs ../dist/index.html
import * as esbuild from 'esbuild'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here=path.dirname(fileURLToPath(import.meta.url)), R=path.resolve(here,'..'), T=path.join(here,'node_modules/three');
const r=await esbuild.build({entryPoints:[R+'/src/main.js'],bundle:true,minify:true,format:'esm',write:false,target:'es2022',
 alias:{'three/addons':T+'/examples/jsm','three':T+'/build/three.module.js'}, logLevel:'warning'});
let js=r.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=fs.readFileSync(R+'/index.html','utf8');
let body=html.split(/<body>/)[1].split('</body>')[0].replace(/<script type="module"[^>]*><\/script>\s*/,'');
const css=fs.readFileSync(R+'/style.css','utf8')+'\n'+fs.readFileSync(R+'/src/net/net.css','utf8');
// sound files ride along inline (audio/mother.js looks them up in window.__PINNED_ASSETS)
const assets={}; const voicesOn=/VOICES = true/.test(fs.readFileSync(R+'/src/audio/samples.js','utf8')); // off until Petra approves the takes
for (const f of (voicesOn&&fs.existsSync(path.join(R,'audio'))?fs.readdirSync(path.join(R,'audio')):[]).filter(f=>/\.(ogg|m4a)$/.test(f)).map(f=>'audio/'+f)) { const mime=f.endsWith('.ogg')?'audio/ogg':'audio/mp4'; assets[f]=`data:${mime};base64,`+fs.readFileSync(path.join(R,f)).toString('base64'); }
js=`window.__PINNED_ASSETS=${JSON.stringify(assets)};\n`+js;
const out=`<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Pinned</title>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&display=swap">\n<style>\n${css}\n</style>\n</head>\n<body>\n${body}\n<script type="module">\n${js}</script>\n</body>\n</html>\n`;
const dest=path.resolve(process.argv[2]||path.join(R,'dist/index.html'));
fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.writeFileSync(dest,out); console.log('wrote',dest,'bytes',out.length);
