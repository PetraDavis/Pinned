// Canvas-generated textures. No external assets.
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(g, w, h, amount, r, alpha = 0.08) {
  for (let i = 0; i < amount; i++) {
    const v = Math.floor(r() * 255);
    g.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
  }
}

function stains(g, w, h, n, r, color = '0,0,0', a = 0.12) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = 10 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${color},${a})`);
    gr.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

export const tex = {};

export function buildTextures() {
  // Grey ashlar stone for facades
  tex.stone = canvasTex(512, 512, (g, w, h) => {
    const r = rng(1);
    g.fillStyle = '#6d6c69'; g.fillRect(0, 0, w, h);
    const bh = 32;
    for (let y = 0; y < h; y += bh) {
      const off = (y / bh) % 2 ? 0 : 48;
      for (let x = -off; x < w; x += 96) {
        const v = 95 + Math.floor(r() * 25);
        g.fillStyle = `rgb(${v},${v - 1},${v - 4})`;
        g.fillRect(x + 2, y + 2, 92, bh - 4);
      }
    }
    noise(g, w, h, 9000, r, 0.1);
    // streaks of grime running down
    for (let i = 0; i < 40; i++) {
      const x = r() * w, len = 60 + r() * 250;
      const gr = g.createLinearGradient(0, 0, 0, len);
      gr.addColorStop(0, 'rgba(20,22,18,0.25)'); gr.addColorStop(1, 'rgba(20,22,18,0)');
      g.fillStyle = gr; g.fillRect(x, r() * h, 2 + r() * 6, len);
    }
    stains(g, w, h, 25, r, '30,40,25', 0.15);
  }, [1, 1]);

  tex.slate = canvasTex(256, 256, (g, w, h) => {
    const r = rng(2);
    g.fillStyle = '#1f2125'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      const off = (y / 16) % 2 ? 0 : 12;
      for (let x = -off; x < w; x += 24) {
        const v = 38 + Math.floor(r() * 18);
        g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
        g.beginPath();
        g.moveTo(x + 1, y); g.lineTo(x + 23, y); g.lineTo(x + 23, y + 12);
        g.arc(x + 12, y + 12, 11, 0, Math.PI); g.closePath(); g.fill();
      }
    }
    noise(g, w, h, 3000, r, 0.08);
  });

  tex.grass = canvasTex(256, 256, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = '#1c2616'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) {
      const v = r();
      g.strokeStyle = `rgba(${30 + v * 40},${45 + v * 50},${20 + v * 20},0.6)`;
      const x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 6); g.stroke();
    }
    stains(g, w, h, 20, r, '40,30,20', 0.2);
  }, [60, 60]);

  tex.gravel = canvasTex(256, 256, (g, w, h) => {
    const r = rng(4);
    g.fillStyle = '#3c3a36'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = 50 + r() * 60;
      g.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
      g.beginPath(); g.arc(r() * w, r() * h, 0.5 + r() * 2, 0, 7); g.fill();
    }
    stains(g, w, h, 30, r, '20,35,15', 0.3);
  }, [2, 20]);

  // Grey damask wallpaper, peeling and stained
  tex.wallpaper = canvasTex(512, 512, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = '#5e5f62'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(40,40,46,0.35)'; g.fillStyle = 'rgba(80,82,88,0.5)';
    for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) {
      const ox = (y / 128) % 2 ? 64 : 0;
      g.save(); g.translate(x + ox, y + 64);
      for (const s of [1, -1]) {
        g.beginPath(); g.moveTo(0, -50);
        g.bezierCurveTo(30 * s, -30, 34 * s, 10, 0, 50);
        g.bezierCurveTo(14 * s, 10, 10 * s, -20, 0, -50);
        g.fill(); g.stroke();
      }
      g.beginPath(); g.arc(0, 0, 6, 0, 7); g.stroke();
      g.restore();
    }
    g.fillStyle = 'rgba(30,30,30,0.15)';
    for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h);
    stains(g, w, h, 30, r, '50,40,25', 0.18);
    for (let i = 0; i < 18; i++) {
      const x = r() * w, len = 100 + r() * 300;
      const gr = g.createLinearGradient(0, 0, 0, len);
      gr.addColorStop(0, 'rgba(40,32,20,0.3)'); gr.addColorStop(1, 'rgba(40,32,20,0)');
      g.fillStyle = gr; g.fillRect(x, 0, 3 + r() * 10, len);
    }
    noise(g, w, h, 8000, r, 0.06);
  });

  tex.floor = canvasTex(512, 512, (g, w, h) => {
    const r = rng(6);
    for (let y = 0; y < h; y += 32) {
      let x = -Math.floor(r() * 200);
      while (x < w) {
        const len = 120 + r() * 200, v = r();
        g.fillStyle = `rgb(${50 + v * 20},${36 + v * 14},${24 + v * 10})`;
        g.fillRect(x, y, len, 32);
        g.fillStyle = 'rgba(10,6,3,0.7)'; g.fillRect(x, y, 2, 32);
        for (let k = 0; k < 6; k++) {
          g.fillStyle = 'rgba(20,12,6,0.25)';
          g.fillRect(x, y + 4 + r() * 24, len, 1);
        }
        x += len;
      }
      g.fillStyle = 'rgba(10,6,3,0.8)'; g.fillRect(0, y, w, 2);
    }
    stains(g, w, h, 40, r, '140,135,125', 0.12); // dust
    noise(g, w, h, 6000, r, 0.07);
  }, [4, 3]);

  tex.wood = canvasTex(256, 256, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#2e1d12'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = `rgba(${15 + r() * 30},${8 + r() * 15},4,0.4)`;
      g.beginPath(); const y = r() * h; g.moveTo(0, y);
      g.bezierCurveTo(w / 3, y + (r() - .5) * 10, 2 * w / 3, y + (r() - .5) * 10, w, y); g.stroke();
    }
    stains(g, w, h, 12, r, '120,115,105', 0.12);
  });

  tex.plank = canvasTex(256, 64, (g, w, h) => {
    const r = rng(8);
    g.fillStyle = '#3a2f24'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(20,14,8,${0.2 + r() * 0.3})`;
      const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - .5) * 6); g.stroke();
    }
    noise(g, w, h, 1500, r, 0.1);
  });

  tex.fabric = canvasTex(128, 128, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = '#3d1f22'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${r() * .15})`; g.fillRect(0, y, w, 1); }
    stains(g, w, h, 10, r, '150,140,130', 0.18);
  });

  tex.sheet = canvasTex(128, 128, (g, w, h) => {
    const r = rng(10);
    g.fillStyle = '#a7a39a'; g.fillRect(0, 0, w, h);
    stains(g, w, h, 18, r, '70,60,40', 0.2);
    noise(g, w, h, 2000, r, 0.06);
  });

  tex.rug = canvasTex(512, 384, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = '#3a1416'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6b5530'; g.lineWidth = 10; g.strokeRect(20, 20, w - 40, h - 40);
    g.lineWidth = 3; g.strokeRect(42, 42, w - 84, h - 84);
    g.fillStyle = '#20262c';
    g.beginPath(); g.ellipse(w / 2, h / 2, 140, 100, 0, 0, 7); g.fill();
    g.strokeStyle = '#6b5530'; g.stroke();
    stains(g, w, h, 30, r, '150,140,120', 0.15);
    noise(g, w, h, 8000, r, 0.08);
  });

  tex.web = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(220,220,220,0.5)'; g.lineWidth = 1;
    for (let a = 0; a <= Math.PI / 2 + 0.01; a += Math.PI / 16) {
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 256, Math.sin(a) * 256); g.stroke();
    }
    for (let rad = 20; rad < 250; rad += 18) {
      g.beginPath();
      for (let a = 0; a <= Math.PI / 2 + 0.01; a += Math.PI / 16) {
        const rr = rad - Math.sin(a * 8) * 4;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.stroke();
    }
  });

  tex.grassBlade = canvasTex(128, 128, (g, w, h) => {
    const r = rng(12);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = 10 + r() * 108, top = 10 + r() * 70, v = r();
      g.strokeStyle = `rgb(${35 + v * 40},${50 + v * 45},${22 + v * 15})`;
      g.lineWidth = 2 + r() * 2;
      g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + (r() - .5) * 20, top + 40, x + (r() - .5) * 30, top); g.stroke();
    }
  }, [1, 1]);

  tex.mosaic = makeMothMosaic(13);
  tex.mosaicFloor = makeMothMosaic(29, true);
  tex.specimens = makeSpecimenCase();
  tex.painting = canvasTex(256, 320, (g, w, h) => {
    const r = rng(14);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1d1a14'); gr.addColorStop(1, '#0c0b08');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3024';
    g.beginPath(); g.ellipse(w / 2, 120, 50, 64, 0, 0, 7); g.fill(); // a face
    g.fillRect(w / 2 - 80, 180, 160, 160);
    g.fillStyle = '#0c0a08';
    g.beginPath(); g.ellipse(w / 2 - 18, 112, 12, 6, 0, 0, 7); g.ellipse(w / 2 + 18, 112, 12, 6, 0, 0, 7); g.fill(); // scratched-out eyes
    stains(g, w, h, 20, r, '0,0,0', 0.3);
  });
}

// Draws a moth silhouette to a small canvas in flat colours, then
// re-renders it as a tiled, aged mosaic with grout and missing tesserae.
export function makeMothMosaic(seed, round = false) {
  const N = 72;
  const src = document.createElement('canvas'); src.width = src.height = N;
  const s = src.getContext('2d');
  s.fillStyle = '#1e3036'; s.fillRect(0, 0, N, N);
  // border ring
  s.strokeStyle = '#8a7346'; s.lineWidth = 3;
  if (round) { s.beginPath(); s.arc(N / 2, N / 2, N / 2 - 3, 0, 7); s.stroke(); }
  else s.strokeRect(2, 2, N - 4, N - 4);
  const cx = N / 2, cy = N / 2 + 2;
  const wing = (sx, upper) => {
    s.beginPath(); s.moveTo(cx, cy + (upper ? -6 : 2));
    if (upper) s.bezierCurveTo(cx + sx * 12, cy - 30, cx + sx * 34, cy - 26, cx + sx * 31, cy - 8);
    else s.bezierCurveTo(cx + sx * 26, cy - 2, cx + sx * 26, cy + 22, cx + sx * 8, cy + 20);
    s.lineTo(cx, cy + (upper ? 0 : 6)); s.closePath();
  };
  for (const sx of [1, -1]) {
    s.fillStyle = '#d6cdb2'; wing(sx, true); s.fill();
    s.fillStyle = '#b9a77e'; wing(sx, false); s.fill();
    s.strokeStyle = '#6a5a3e'; s.lineWidth = 1.5; wing(sx, true); s.stroke(); wing(sx, false); s.stroke();
    // eyespots
    s.fillStyle = '#5c1b1b'; s.beginPath(); s.arc(cx + sx * 18, cy - 14, 5, 0, 7); s.fill();
    s.fillStyle = '#e8dfc4'; s.beginPath(); s.arc(cx + sx * 18, cy - 14, 2, 0, 7); s.fill();
    s.fillStyle = '#5c1b1b'; s.beginPath(); s.arc(cx + sx * 13, cy + 10, 3, 0, 7); s.fill();
    // antennae
    s.strokeStyle = '#6a5a3e'; s.lineWidth = 1.5;
    s.beginPath(); s.moveTo(cx, cy - 12); s.quadraticCurveTo(cx + sx * 6, cy - 26, cx + sx * 12, cy - 28); s.stroke();
  }
  s.fillStyle = '#4a3726';
  s.beginPath(); s.ellipse(cx, cy - 1, 3.2, 13, 0, 0, 7); s.fill();
  s.beginPath(); s.arc(cx, cy - 14, 3, 0, 7); s.fill();
  const px = s.getImageData(0, 0, N, N).data;

  const T = 12, out = document.createElement('canvas');
  out.width = out.height = N * T;
  const g = out.getContext('2d');
  const r = rng(seed);
  g.fillStyle = '#2a2a27'; g.fillRect(0, 0, out.width, out.height);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (round && Math.hypot(x - N / 2, y - N / 2) > N / 2) continue;
    if (r() < 0.035) continue; // missing tile
    const i = (y * N + x) * 4, j = (r() - 0.5) * 30;
    g.fillStyle = `rgb(${px[i] + j},${px[i + 1] + j},${px[i + 2] + j})`;
    const jx = (r() - .5) * 1.5, jy = (r() - .5) * 1.5;
    g.fillRect(x * T + 1 + jx, y * T + 1 + jy, T - 2, T - 2);
  }
  stains(g, out.width, out.height, 40, r, '20,22,18', 0.25);
  // cracks
  g.strokeStyle = 'rgba(15,15,12,0.7)'; g.lineWidth = 2;
  for (let k = 0; k < 4; k++) {
    let x = r() * out.width, y = r() * out.height; g.beginPath(); g.moveTo(x, y);
    for (let n = 0; n < 8; n++) { x += (r() - .5) * 120; y += (r() - .5) * 120; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(out);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function makeSpecimenCase() {
  return canvasTex(512, 256, (g, w, h) => {
    const r = rng(21);
    g.fillStyle = '#c9c1a8'; g.fillRect(0, 0, w, h);
    stains(g, w, h, 20, r, '90,70,40', 0.2);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) {
      const x = 40 + col * 68, y = 45 + row * 80, sc = 0.6 + r() * 0.5;
      const hue = r();
      g.save(); g.translate(x, y); g.scale(sc, sc);
      g.fillStyle = hue < .3 ? '#6b5a3a' : hue < .6 ? '#8b8270' : hue < .8 ? '#3d3a35' : '#a08850';
      for (const sx of [1, -1]) {
        g.beginPath(); g.moveTo(0, -3); g.bezierCurveTo(sx * 10, -24, sx * 30, -20, sx * 26, -4); g.lineTo(0, 2); g.fill();
        g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(sx * 20, 0, sx * 20, 18, sx * 6, 16); g.fill();
      }
      g.fillStyle = '#2a2016'; g.fillRect(-2, -10, 4, 24);
      g.fillStyle = '#ddd'; g.beginPath(); g.arc(0, -6, 1.6, 0, 7); g.fill(); // the pin
      g.restore();
      g.fillStyle = '#4a4030'; g.fillRect(x - 12, y + 26, 24, 4); // label
    }
  });
}
