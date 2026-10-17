// Network links between the host and each player. The host's browser is the server:
// every player has exactly one link, to the host, and the host relays between players.
// Two ways to open a link, both peer-to-peer WebRTC:
//  - PeerJS cloud signaling (free public broker, no backend of ours): the host registers
//    a short room code, players connect to it by code.
//  - Manual: the host's offer and the player's answer are copied and pasted by hand
//    (works with no signaling server at all, e.g. on a LAN or when the broker is down).
// A link is { send(obj), onmessage, onclose, close(), open }. Messages are JSON objects.

export const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/+esm';
const PREFIX = 'pinned-pale-wing-';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

export const newRoomCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
export const cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

function makeLink(sendRaw, closeRaw) {
  const link = { open: true, onmessage: null, onclose: null,
    send(obj) { if (!link.open) return; try { sendRaw(obj); } catch (e) { console.warn('[net] send failed', e); } },
    close() { if (!link.open) return; link.open = false; try { closeRaw(); } catch { /* already gone */ } if (link.onclose) link.onclose(); },
    _recv(obj) { if (obj && typeof obj === 'object' && link.onmessage) link.onmessage(obj); },
    _closed() { if (!link.open) return; link.open = false; if (link.onclose) link.onclose(); },
  };
  return link;
}

// ---------- PeerJS ----------
// Optional own PeerJS server instead of the public cloud one: ?peer=host:port[/path] in the URL
// (plain ws on localhost/LAN, wss elsewhere). The default is the free PeerJS cloud broker.
function brokerOptions() {
  let spec = null; try { spec = new URLSearchParams(location.search).get('peer'); } catch { /* no URL */ }
  if (!spec) return {};
  const m = /^([^:/]+)(?::(\d+))?(\/.*)?$/.exec(spec); if (!m) return {};
  const local = /^(localhost|127\.|10\.|192\.168\.)/.test(m[1]);
  return { host: m[1], port: +(m[2] || (local ? 9000 : 443)), path: m[3] || '/', secure: !local };
}
let peerMod = null;
async function loadPeer() { if (!peerMod) peerMod = await import(PEERJS_URL); return peerMod.Peer || peerMod.default; }

function wrapDataConnection(dc) {
  const link = makeLink(o => dc.send(o), () => dc.close());
  dc.on('data', d => { try { link._recv(typeof d === 'string' ? JSON.parse(d) : d); } catch { /* malformed */ } });
  dc.on('close', () => link._closed());
  dc.on('error', () => link._closed());
  return link;
}

// Host: register a room code with the broker. onLink is called for every player who connects.
export async function hostPeer(onLink, onError) {
  const Peer = await loadPeer();
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = newRoomCode();
    try {
      const peer = await new Promise((res, rej) => {
        const p = new Peer(PREFIX + code, { debug: 0, config: { iceServers: ICE }, ...brokerOptions() });
        const t = setTimeout(() => { p.destroy(); rej(new Error('The signaling server did not answer.')); }, 12000);
        p.once('open', () => { clearTimeout(t); res(p); });
        p.once('error', e => { clearTimeout(t); p.destroy(); rej(e); });
      });
      peer.on('connection', dc => { let done = false; dc.on('open', () => { if (!done) { done = true; onLink(wrapDataConnection(dc)); } }); });
      // lost the broker: existing links keep working; reconnect so new players can still join
      peer.on('disconnected', () => { setTimeout(() => { if (!peer.destroyed) try { peer.reconnect(); } catch { /* ignore */ } }, 2000); });
      peer.on('error', e => onError && onError(e));
      return { code, close: () => peer.destroy() };
    } catch (e) {
      if (e && e.type === 'unavailable-id') continue; // code taken: pick another
      throw e;
    }
  }
  throw new Error('Could not get a room code.');
}

// Player: connect to a host by room code.
export async function joinPeer(code) {
  const Peer = await loadPeer();
  return new Promise((res, rej) => {
    const p = new Peer({ debug: 0, config: { iceServers: ICE }, ...brokerOptions() });
    const fail = e => { clearTimeout(t); p.destroy(); rej(e && e.type === 'peer-unavailable' ? new Error('No game with that code.') : e); };
    const t = setTimeout(() => fail(new Error('Could not reach the host.')), 20000);
    p.once('error', fail);
    let asked = false;
    p.once('open', () => {
      if (asked) return; asked = true;
      const dc = p.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      let opened = false;
      dc.on('open', () => {
        if (opened) return; opened = true; clearTimeout(t); p.off('error', fail);
        const link = wrapDataConnection(dc);
        const close0 = link.close; link.close = () => { close0(); p.destroy(); };
        res(link);
      });
    });
  });
}

// ---------- manual copy-paste ----------
const pack = desc => btoa(unescape(encodeURIComponent(JSON.stringify({ type: desc.type, sdp: desc.sdp }))));
const unpack = s => JSON.parse(decodeURIComponent(escape(atob(String(s).trim().replace(/\s+/g, '')))));

function waitIce(pc, ms = 3000) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise(res => {
    const t = setTimeout(res, ms);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
}

function manualPc() {
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const dc = pc.createDataChannel('game', { negotiated: true, id: 0, ordered: true });
  const link = makeLink(o => dc.send(JSON.stringify(o)), () => { dc.close(); pc.close(); });
  dc.onmessage = e => { try { link._recv(JSON.parse(e.data)); } catch { /* malformed */ } };
  dc.onclose = () => link._closed();
  pc.addEventListener('connectionstatechange', () => { if (['failed', 'closed'].includes(pc.connectionState)) link._closed(); });
  const opened = new Promise(res => { if (dc.readyState === 'open') res(); else dc.addEventListener('open', res, { once: true }); });
  return { pc, link, opened };
}

// Host side: make an offer code; accept(answerCode) resolves with the link once open.
export async function manualOffer() {
  const { pc, link, opened } = manualPc();
  await pc.setLocalDescription(await pc.createOffer());
  await waitIce(pc);
  return { code: pack(pc.localDescription), async accept(answer) { await pc.setRemoteDescription(unpack(answer)); await opened; return link; }, cancel: () => link.close() };
}

// Player side: answer an offer code. Returns the answer code, and a promise of the link.
export async function manualAnswer(offer) {
  const { pc, link, opened } = manualPc();
  await pc.setRemoteDescription(unpack(offer));
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIce(pc);
  return { code: pack(pc.localDescription), link: opened.then(() => link), cancel: () => link.close() };
}
