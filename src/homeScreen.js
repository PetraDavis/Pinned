// Home screen backdrop: a pinned moth in a Victorian display case behind dusty glass.
// The moth's wings twitch now and then, as if it is not quite dead.
export function startHomeBackdrop(canvas) {
  const g = canvas.getContext('2d');
  let w, h, running = true, raf;
  const dust = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.002 + Math.random() * 0.006, s: 0.5 + Math.random() * 1.5 }));
  // static backing paper with stains, regenerated on resize
  let paper;
  const resize = () => {
    w = canvas.width = innerWidth; h = canvas.height = innerHeight;
    paper = document.createElement('canvas'); paper.width = 512; paper.height = 384;
    const p = paper.getContext('2d');
    p.fillStyle = '#b8ad90'; p.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 512, y = Math.random() * 384, r = 10 + Math.random() * 70;
      const gr = p.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(90,65,35,0.18)'); gr.addColorStop(1, 'rgba(90,65,35,0)');
      p.fillStyle = gr; p.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 4000; i++) { const v = Math.random() * 255; p.fillStyle = `rgba(${v},${v},${v},0.05)`; p.fillRect(Math.random() * 512, Math.random() * 384, 2, 2); }
  };
  resize(); addEventListener('resize', resize);

  // twitch state: occasional small, quick wing movements
  let twitchStart = -10, twitchAmp = 0, nextTwitch = 2.5;

  function wingPath(sx, upper, s) {
    g.beginPath();
    if (upper) {
      g.moveTo(0, -6 * s);
      g.bezierCurveTo(sx * 30 * s, -70 * s, sx * 120 * s, -78 * s, sx * 128 * s, -30 * s);
      g.bezierCurveTo(sx * 120 * s, -4 * s, sx * 60 * s, 4 * s, 0, 4 * s);
    } else {
      g.moveTo(0, 2 * s);
      g.bezierCurveTo(sx * 80 * s, 0, sx * 100 * s, 60 * s, sx * 60 * s, 80 * s);
      g.bezierCurveTo(sx * 30 * s, 90 * s, sx * 8 * s, 40 * s, 0, 24 * s);
    }
    g.closePath();
  }

  function moth(cx, cy, s, t) {
    let k = 0;
    const dt = t - twitchStart;
    if (dt < 0.5) k = Math.sin(dt / 0.5 * Math.PI * 3) * Math.exp(-dt * 6) * twitchAmp;
    if (t > nextTwitch) { twitchStart = t; twitchAmp = 0.12 + Math.random() * 0.18; nextTwitch = t + 3 + Math.random() * 7; }
    const breathe = Math.sin(t * 0.8) * 0.006;
    // shadow on the paper
    g.save(); g.translate(cx + 10 * s, cy + 14 * s); g.fillStyle = 'rgba(40,28,15,0.35)'; g.filter = 'blur(6px)';
    for (const sx of [-1, 1]) { wingPath(sx, true, s); g.fill(); wingPath(sx, false, s); g.fill(); }
    g.restore();
    for (const sx of [-1, 1]) {
      g.save(); g.translate(cx, cy);
      g.scale(1 - Math.abs(k) * 0.9 - breathe, 1); g.rotate(sx * k * 0.25);
      // hindwing
      let gr = g.createLinearGradient(0, 0, sx * 100 * s, 80 * s);
      gr.addColorStop(0, '#8a6f4a'); gr.addColorStop(1, '#c2a679');
      g.fillStyle = gr; wingPath(sx, false, s); g.fill();
      g.fillStyle = '#5c1b1b'; g.beginPath(); g.arc(sx * 52 * s, 46 * s, 11 * s, 0, 7); g.fill();
      g.fillStyle = '#e8dfc4'; g.beginPath(); g.arc(sx * 52 * s, 46 * s, 4 * s, 0, 7); g.fill();
      // forewing
      gr = g.createLinearGradient(0, 0, sx * 128 * s, -40 * s);
      gr.addColorStop(0, '#9c8664'); gr.addColorStop(0.6, '#d6cdb2'); gr.addColorStop(1, '#a89470');
      g.fillStyle = gr; wingPath(sx, true, s); g.fill();
      g.strokeStyle = 'rgba(70,50,30,0.5)'; g.lineWidth = 1.2 * s;
      for (let v = 0; v < 5; v++) { g.beginPath(); g.moveTo(0, -2 * s); g.quadraticCurveTo(sx * (40 + v * 15) * s, -40 * s + v * 6 * s, sx * (90 + v * 8) * s, (-55 + v * 12) * s); g.stroke(); }
      g.fillStyle = '#4a1414'; g.beginPath(); g.arc(sx * 78 * s, -36 * s, 14 * s, 0, 7); g.fill();
      g.fillStyle = '#e8dfc4'; g.beginPath(); g.arc(sx * 78 * s, -36 * s, 5 * s, 0, 7); g.fill();
      g.strokeStyle = 'rgba(60,40,20,0.7)'; g.lineWidth = 2 * s; wingPath(sx, true, s); g.stroke();
      // antenna
      g.strokeStyle = '#4a3726'; g.lineWidth = 1.6 * s;
      g.beginPath(); g.moveTo(0, -30 * s); g.quadraticCurveTo(sx * 14 * s, -64 * s, sx * 34 * s, -72 * s); g.stroke();
      g.restore();
    }
    // body
    g.fillStyle = '#4a3726';
    g.beginPath(); g.ellipse(cx, cy + 8 * s, 8 * s, 40 * s, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(cx, cy - 30 * s, 8 * s, 0, 7); g.fill();
    g.strokeStyle = 'rgba(30,20,10,0.6)'; g.lineWidth = 1;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(cx - 7 * s, cy + (i * 9 - 4) * s); g.lineTo(cx + 7 * s, cy + (i * 9 - 4) * s); g.stroke(); }
    // the pin
    g.fillStyle = '#ddd'; g.beginPath(); g.arc(cx, cy - 12 * s, 3.5 * s, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(cx - 1 * s, cy - 13 * s, 1.2 * s, 0, 7); g.fill();
  }

  function frame(ms) {
    if (!running) return;
    const t = ms / 1000;
    g.fillStyle = '#060504'; g.fillRect(0, 0, w, h);
    const narrow = w < 800;
    const cw = Math.min(narrow ? w * 0.92 : w * 0.5, h * 0.95 * 4 / 3), chh = cw * 0.75;
    const cx = narrow ? w / 2 : w * 0.66, cy = narrow ? h * 0.3 : h * 0.5;
    const x0 = cx - cw / 2, y0 = cy - chh / 2, b = cw * 0.06;
    // wooden frame
    const wood = g.createLinearGradient(x0, y0, x0 + cw, y0 + chh);
    wood.addColorStop(0, '#3a2414'); wood.addColorStop(0.5, '#2a190d'); wood.addColorStop(1, '#1b0f07');
    g.fillStyle = wood; g.fillRect(x0, y0, cw, chh);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 40; i++) { g.beginPath(); const yy = y0 + (i / 40) * chh; g.moveTo(x0, yy); g.lineTo(x0 + cw, yy + Math.sin(i) * 3); g.stroke(); }
    g.strokeStyle = '#5a3a1e'; g.lineWidth = 2; g.strokeRect(x0 + b * 0.4, y0 + b * 0.4, cw - b * 0.8, chh - b * 0.8);
    // backing paper
    g.drawImage(paper, x0 + b, y0 + b, cw - 2 * b, chh - 2 * b);
    const ix = x0 + b, iy = y0 + b, iw = cw - 2 * b, ih = chh - 2 * b;
    // inner shadow
    const sh = g.createLinearGradient(0, iy, 0, iy + 30); sh.addColorStop(0, 'rgba(0,0,0,0.6)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(ix, iy, iw, 30);
    // moth
    moth(cx, cy - ih * 0.04, iw / 380, t);
    // brass label
    const lw = iw * 0.46, lh = ih * 0.08, lx = cx - lw / 2, ly = iy + ih * 0.84;
    const brass = g.createLinearGradient(lx, ly, lx, ly + lh); brass.addColorStop(0, '#a8874a'); brass.addColorStop(0.5, '#7a5f2e'); brass.addColorStop(1, '#5a4520');
    g.fillStyle = brass; g.fillRect(lx, ly, lw, lh);
    g.fillStyle = '#2a1c0c'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic ${Math.round(lh * 0.42)}px Georgia, serif`;
    g.fillText('Phalaena pallida  —  Ord. P.W. 1887', cx, ly + lh / 2);
    for (const sx of [lx + 6, lx + lw - 6]) { g.fillStyle = '#3a2a10'; g.beginPath(); g.arc(sx, ly + lh / 2, 2, 0, 7); g.fill(); }
    // light pool from above, vignette
    const lg = g.createRadialGradient(cx - iw * 0.1, iy, 0, cx, cy, cw * 0.75);
    lg.addColorStop(0, 'rgba(255,230,180,0.08)'); lg.addColorStop(0.6, 'rgba(0,0,0,0.15)'); lg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = lg; g.fillRect(x0, y0, cw, chh);
    // glass: dust film, smudges, reflection streaks
    g.fillStyle = 'rgba(200,200,190,0.05)'; g.fillRect(ix, iy, iw, ih);
    g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip();
    const rx = ix + iw * (0.15 + Math.sin(t * 0.05) * 0.02);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.beginPath(); g.moveTo(rx, iy); g.lineTo(rx + iw * 0.12, iy); g.lineTo(rx - iw * 0.18, iy + ih); g.lineTo(rx - iw * 0.3, iy + ih); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.035)';
    g.beginPath(); g.moveTo(rx + iw * 0.2, iy); g.lineTo(rx + iw * 0.24, iy); g.lineTo(rx - iw * 0.06, iy + ih); g.lineTo(rx - iw * 0.1, iy + ih); g.fill();
    g.restore();
    // floating dust in the light
    for (const d of dust) {
      d.y -= d.v / 60; d.x += Math.sin(t + d.y * 9) * 0.0002; if (d.y < 0) d.y = 1;
      g.fillStyle = `rgba(220,210,180,${0.25 + 0.2 * Math.sin(t * 2 + d.x * 30)})`;
      g.fillRect(d.x * w, d.y * h, d.s, d.s);
    }
    // overall vignette
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.85)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return {
    stop() { running = false; cancelAnimationFrame(raf); },
    start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } },
  };
}
