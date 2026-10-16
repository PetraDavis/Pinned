// Home screen backdrop: a death's-head hawkmoth pinned in a Victorian display case
// behind dusty glass. The wings twitch now and then, as if it is not quite dead.
// Everything static is pre-rendered at device resolution on resize; each frame only
// composites the layers, the twitching wings and the dust.
import { renderMothLayers, drawLabel } from './moths.js';

const SPECIES = 'atropos';

export function startHomeBackdrop(canvas) {
  const g = canvas.getContext('2d');
  let running = true, raf, W, H, dpr, L;
  const dust = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random(), v: 0.002 + Math.random() * 0.006, s: 0.5 + Math.random() * 1.5 }));
  let twitchStart = -10, twitchAmp = 0, nextTwitch = 2.5;

  function layout() {
    const narrow = W < 800 * dpr;
    const cw = Math.min(narrow ? W * 0.92 : W * 0.5, H * 0.95 * 4 / 3), ch = cw * 0.75;
    const cx = narrow ? W / 2 : W * 0.66, cy = narrow ? H * 0.3 : H * 0.5;
    const b = cw * 0.065;
    return { cw, ch, cx, cy, x0: cx - cw / 2, y0: cy - ch / 2, b, ix: cx - cw / 2 + b, iy: cy - ch / 2 + b, iw: cw - 2 * b, ih: ch - 2 * b };
  }

  function layer(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

  function build() {
    dpr = Math.min(devicePixelRatio || 1, 3);
    W = canvas.width = Math.round(innerWidth * dpr); H = canvas.height = Math.round(innerHeight * dpr);
    canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
    const P = layout();
    // ---- static case layer ----
    const [st, s] = layer(W, H);
    s.fillStyle = '#060504'; s.fillRect(0, 0, W, H);
    // mahogany frame with grain, mitred corners and a gilt slip
    const wood = s.createLinearGradient(P.x0, P.y0, P.x0 + P.cw, P.y0 + P.ch);
    wood.addColorStop(0, '#4a2c18'); wood.addColorStop(0.5, '#33200f'); wood.addColorStop(1, '#1e1108');
    s.fillStyle = wood; s.fillRect(P.x0, P.y0, P.cw, P.ch);
    s.save(); s.beginPath(); s.rect(P.x0, P.y0, P.cw, P.ch); s.clip();
    for (let i = 0; i < 900; i++) {
      const horiz = Math.random() < 0.5, t = Math.random();
      s.strokeStyle = `rgba(${Math.random() < 0.5 ? '10,5,2' : '120,70,35'},${0.08 + Math.random() * 0.15})`; s.lineWidth = dpr * (0.5 + Math.random());
      s.beginPath();
      if (horiz) { const y = P.y0 + t * P.ch; s.moveTo(P.x0, y); s.bezierCurveTo(P.x0 + P.cw * 0.3, y + (Math.random() - 0.5) * 6 * dpr, P.x0 + P.cw * 0.7, y + (Math.random() - 0.5) * 6 * dpr, P.x0 + P.cw, y); }
      else { const x = P.x0 + t * P.cw; s.moveTo(x, P.y0); s.bezierCurveTo(x + (Math.random() - 0.5) * 6 * dpr, P.y0 + P.ch * 0.3, x + (Math.random() - 0.5) * 6 * dpr, P.y0 + P.ch * 0.7, x, P.y0 + P.ch); }
      s.stroke();
    }
    s.restore();
    s.strokeStyle = 'rgba(0,0,0,0.5)'; s.lineWidth = dpr;
    for (const [a, b2] of [[[P.x0, P.y0], [P.ix, P.iy]], [[P.x0 + P.cw, P.y0], [P.ix + P.iw, P.iy]], [[P.x0, P.y0 + P.ch], [P.ix, P.iy + P.ih]], [[P.x0 + P.cw, P.y0 + P.ch], [P.ix + P.iw, P.iy + P.ih]]]) { s.beginPath(); s.moveTo(...a); s.lineTo(...b2); s.stroke(); }
    const gilt = s.createLinearGradient(P.ix, P.iy, P.ix + P.iw, P.iy + P.ih);
    gilt.addColorStop(0, '#8a6a30'); gilt.addColorStop(0.5, '#c8a050'); gilt.addColorStop(1, '#6a4a20');
    s.strokeStyle = gilt; s.lineWidth = 4 * dpr; s.strokeRect(P.ix - 2 * dpr, P.iy - 2 * dpr, P.iw + 4 * dpr, P.ih + 4 * dpr);
    // aged linen backing
    s.fillStyle = '#c4b896'; s.fillRect(P.ix, P.iy, P.iw, P.ih);
    s.save(); s.beginPath(); s.rect(P.ix, P.iy, P.iw, P.ih); s.clip();
    for (let y = P.iy; y < P.iy + P.ih; y += 2 * dpr) { s.fillStyle = `rgba(90,70,40,${Math.random() * 0.05})`; s.fillRect(P.ix, y, P.iw, dpr); }
    for (let x = P.ix; x < P.ix + P.iw; x += 2 * dpr) { s.fillStyle = `rgba(255,250,230,${Math.random() * 0.05})`; s.fillRect(x, P.iy, dpr, P.ih); }
    for (let i = 0; i < 30; i++) {
      const x = P.ix + Math.random() * P.iw, y = P.iy + Math.random() * P.ih, r = (20 + Math.random() * 90) * dpr;
      const gr = s.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(110,80,40,0.16)'); gr.addColorStop(1, 'rgba(110,80,40,0)');
      s.fillStyle = gr; s.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    const sh = s.createLinearGradient(0, P.iy, 0, P.iy + 50 * dpr); sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    s.fillStyle = sh; s.fillRect(P.ix, P.iy, P.iw, 50 * dpr);
    s.restore();
    // handwritten specimen label under the moth
    drawLabel(s, SPECIES, P.cx, P.iy + P.ih * 0.66, Math.max(P.iw * 0.4, Math.min(P.iw * 0.7, 260 * dpr)));
    // brass plate on the frame
    const lw = P.iw * 0.46, lh = P.b * 0.62, lx = P.cx - lw / 2, ly = P.y0 + P.ch - P.b * 0.81;
    const brass = s.createLinearGradient(lx, ly, lx, ly + lh); brass.addColorStop(0, '#c8a458'); brass.addColorStop(0.45, '#8a6a30'); brass.addColorStop(1, '#5a4218');
    s.fillStyle = brass; s.fillRect(lx, ly, lw, lh);
    s.strokeStyle = 'rgba(255,230,170,0.4)'; s.lineWidth = dpr; s.strokeRect(lx + dpr, ly + dpr, lw - 2 * dpr, lh - 2 * dpr);
    s.fillStyle = '#2a1c0a'; s.textAlign = 'center'; s.textBaseline = 'middle';
    const plateText = 'THE ORDER OF THE PALE WING · MDCCCLXXXVII';
    let fpx = lh * 0.42; s.font = `${fpx}px Georgia, serif`;
    const tw = s.measureText(plateText).width, maxw = lw - lh * 1.4; // keep clear of the screws
    if (tw > maxw) { fpx *= maxw / tw; s.font = `${fpx}px Georgia, serif`; }
    s.fillText(plateText, P.cx, ly + lh / 2 + dpr);
    for (const sx of [lx + lh * 0.3, lx + lw - lh * 0.3]) { s.fillStyle = '#3a2a10'; s.beginPath(); s.arc(sx, ly + lh / 2, lh * 0.12, 0, 7); s.fill(); }
    // ---- moth layers ----
    const size = P.iw * 0.78;
    const m = renderMothLayers(SPECIES, size);
    // ---- glass overlay (light pool, dust film, reflections) and vignette ----
    const [gl, o] = layer(W, H);
    const lg = o.createRadialGradient(P.cx - P.iw * 0.1, P.iy, 0, P.cx, P.cy, P.cw * 0.75);
    lg.addColorStop(0, 'rgba(255,230,180,0.08)'); lg.addColorStop(0.6, 'rgba(0,0,0,0.12)'); lg.addColorStop(1, 'rgba(0,0,0,0.55)');
    o.fillStyle = lg; o.fillRect(P.x0, P.y0, P.cw, P.ch);
    o.save(); o.beginPath(); o.rect(P.ix, P.iy, P.iw, P.ih); o.clip();
    o.fillStyle = 'rgba(200,200,190,0.05)'; o.fillRect(P.ix, P.iy, P.iw, P.ih);
    for (let i = 0; i < 6; i++) { const x = P.ix + Math.random() * P.iw, y = P.iy + Math.random() * P.ih, r = (30 + Math.random() * 80) * dpr; const gr = o.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(230,225,210,0.05)'); gr.addColorStop(1, 'rgba(230,225,210,0)'); o.fillStyle = gr; o.fillRect(x - r, y - r, 2 * r, 2 * r); }
    const rx = P.ix + P.iw * 0.15;
    o.fillStyle = 'rgba(255,255,255,0.055)'; o.beginPath(); o.moveTo(rx, P.iy); o.lineTo(rx + P.iw * 0.12, P.iy); o.lineTo(rx - P.iw * 0.18, P.iy + P.ih); o.lineTo(rx - P.iw * 0.3, P.iy + P.ih); o.fill();
    o.fillStyle = 'rgba(255,255,255,0.03)'; o.beginPath(); o.moveTo(rx + P.iw * 0.2, P.iy); o.lineTo(rx + P.iw * 0.24, P.iy); o.lineTo(rx - P.iw * 0.06, P.iy + P.ih); o.lineTo(rx - P.iw * 0.1, P.iy + P.ih); o.fill();
    o.restore();
    const vg = o.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.85)');
    o.fillStyle = vg; o.fillRect(0, 0, W, H);
    L = { P, st, gl, m, mothY: P.iy + P.ih * 0.4 };
  }

  function frame(ms) {
    if (!running) return;
    const t = ms / 1000;
    g.drawImage(L.st, 0, 0);
    // twitch: a quick, damped flutter every few seconds
    let k = 0; const dt = t - twitchStart;
    if (dt < 0.5) k = Math.sin(dt / 0.5 * Math.PI * 3) * Math.exp(-dt * 6) * twitchAmp;
    if (t > nextTwitch) { twitchStart = t; twitchAmp = 0.1 + Math.random() * 0.15; nextTwitch = t + 3 + Math.random() * 7; }
    const { m, P } = L, cx = P.cx, cy = L.mothY;
    for (const side of [1, -1]) {
      g.save(); g.translate(cx, cy - m.originY); g.scale(side * (1 - Math.abs(k) * 0.8), 1);
      g.drawImage(m.wing, -m.ox, 0); g.restore();
    }
    g.drawImage(m.body, cx - m.body.width / 2, cy - m.originY);
    g.drawImage(L.gl, 0, 0);
    for (const d of dust) {
      d.y -= d.v / 60; d.x += Math.sin(t + d.y * 9) * 0.0002; if (d.y < 0) d.y = 1;
      g.fillStyle = `rgba(220,210,180,${0.25 + 0.2 * Math.sin(t * 2 + d.x * 30)})`;
      g.fillRect(d.x * W, d.y * H, d.s * dpr, d.s * dpr);
    }
    raf = requestAnimationFrame(frame);
  }
  build();
  addEventListener('resize', () => { build(); });
  raf = requestAnimationFrame(frame);
  return {
    stop() { running = false; cancelAnimationFrame(raf); },
    start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } },
  };
}
