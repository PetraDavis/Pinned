// Loading in small steps. Building the house is a lot of work; done in one go it froze the
// tab for many seconds on slow machines (Chromebooks). Every builder awaits loadStep()
// between pieces: that hands the main thread back to the browser (input, painting the
// progress bar) whenever a slice of ~40 ms has been used, so the page never looks hung.
const bar = typeof document !== 'undefined' ? document.getElementById('loadBar') : null;
const label = typeof document !== 'undefined' ? document.getElementById('loadWhat') : null;
let last = performance.now(), done = 0;
const TOTAL = 60; // roughly how many steps a load takes (for the bar only)
export const loadTimes = [];
const breathe = () => new Promise(r => {
  // a macrotask lets the browser paint and handle input; rAF is skipped in hidden tabs
  if (typeof MessageChannel === 'undefined') return setTimeout(r, 0);
  const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0);
});
export async function loadStep(what, tag) {
  done++;
  if (label && what) label.textContent = what;
  const now = performance.now();
  if (now - last < 40) return; // still inside this slice: carry on
  if (bar) bar.style.width = Math.min(97, 3 + done / TOTAL * 94).toFixed(1) + '%';
  loadTimes.push([tag || what || '', Math.round(now - last)]);
  // give the browser a real frame now and then so the bar visibly moves
  await (done % 4 ? breathe() : new Promise(r => setTimeout(r, 0)));
  last = performance.now();
}
