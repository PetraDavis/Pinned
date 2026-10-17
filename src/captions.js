// Subtitles / captions. caption(text, duration, { kind }) shows a line at the bottom of the
// screen. kind 'voice' (whispers, story voice-over) shows when captions are on (default);
// kind 'sound' (e.g. "[wings fluttering]") shows only with "Sound captions" enabled.
// Durations count game time: captions freeze while paused. Also exposed as window.caption.
let el = null, settings = { captions: true, soundCaptions: false };
const lines = []; // { node, left }

function ensure() {
  if (el) return el;
  el = document.createElement('div'); el.id = 'captions';
  el.setAttribute('aria-live', 'polite');
  Object.assign(el.style, {
    position: 'fixed', left: '50%', bottom: '17%', transform: 'translateX(-50%)', zIndex: 6,
    width: 'min(640px, calc(100vw - 32px))', display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '4px', pointerEvents: 'none', fontFamily: 'Georgia, serif',
  });
  document.body.appendChild(el);
  return el;
}

export function setCaptionSettings(s) { settings = s; if (!s.captions) clearCaptions(); }

export function caption(text, duration = 3, { kind = 'voice' } = {}) {
  if (kind === 'sound' ? !settings.soundCaptions : settings.captions === false) return;
  const box = ensure();
  // the same sound caption again just refreshes the existing one
  const dup = lines.find(l => l.text === text);
  if (dup) { dup.left = Math.max(dup.left, duration); return; }
  const node = document.createElement('div');
  node.textContent = text;
  Object.assign(node.style, {
    background: 'rgba(0,0,0,.62)', color: kind === 'sound' ? '#b9b2a2' : '#e4ddcc', padding: '3px 10px',
    fontSize: '17px', fontStyle: kind === 'sound' ? 'normal' : 'italic', letterSpacing: '.03em', transition: 'opacity .4s', opacity: 0,
  });
  box.appendChild(node); requestAnimationFrame(() => (node.style.opacity = 1));
  lines.push({ node, text, left: duration });
  while (lines.length > 3) lines.shift().node.remove();
}
export const captionSound = (text, duration = 2) => caption(text, duration, { kind: 'sound' });

export function clearCaptions() { while (lines.length) lines.pop().node.remove(); }

// dt in seconds of game time (0 while paused)
export function updateCaptions(dt) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i]; l.left -= dt;
    if (l.left <= 0.4) l.node.style.opacity = 0;
    if (l.left <= 0) { l.node.remove(); lines.splice(i, 1); }
  }
}

window.caption = (text, duration) => caption(text, duration);
window.captionSound = captionSound;
