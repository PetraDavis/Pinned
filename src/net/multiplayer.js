// Multiplayer session: the host's browser is the server. Players link only to the host;
// the host owns the world (puzzles, doors, pickups), merges what players change, and relays
// positions, chat and voice. All UI for it is built here so the shared files stay small.
//
// Messages (JSON):
//  player -> host: hello{name} s{state} w{world, lamp?} chat{text} rtc{...}
//  host -> player: welcome{id, players, world, at} join{id,name} leave{id} ps{l:[state]}
//                  w{world} chat{from,text,sys?} rtc{...} vmap{s,id} bye
import { hostPeer, joinPeer, manualOffer, manualAnswer, cleanCode } from './link.js';
import { VoicePeer, VoiceOut, getMic } from './voice.js';
import { createRemotes } from './remotes.js';
import { loadSave } from '../storage.js';

const STATE_HZ = 15, WORLD_MS = 300, MAX_PLAYERS = 4; // host + 3
const NAME_KEY = 'pinned.mpName', PREF_KEY = 'pinned.mpVoice';
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };
const el = (tag, props = {}, kids = []) => { const e = Object.assign(document.createElement(tag), props); for (const k of [].concat(kids)) e.append(k); return e; };
const sortKey = w => JSON.stringify(Object.fromEntries(Object.entries(w).filter(([k]) => k !== 'lamp').map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v])));

export function initMultiplayer(G) {
  try { if (!document.getElementById('netCss')) document.head.appendChild(el('link', { id: 'netCss', rel: 'stylesheet', href: new URL('./net.css', import.meta.url).href })); } catch { /* bundled: the styles are inlined */ }
  const remotes = createRemotes(G.scene);

  const S = {
    role: null, myId: null, name: store.get(NAME_KEY) || 'Moth ' + Math.floor(100 + Math.random() * 900), code: null,
    clients: new Map(), // host: id -> { id, name, link, voice, senders: Map(speakerId -> RTCRtpSender), track, state }
    hostLink: null, hostVoice: null, signal: null, nextId: 1,
    names: new Map(), blockSave: false, chatOpen: false,
    lastLamp: null, lastSentKey: null, hostKey: null,
    mic: null, micBlocked: false, muted: false, ptt: false, pttHeld: false, proximity: true,
    outs: new Map(), vmap: new Map(), pendingTracks: new Map(), fwdStreams: new Map(),
  };
  try { Object.assign(S, JSON.parse(store.get(PREF_KEY) || '{}')); } catch { /* defaults */ }
  const savePrefs = () => store.set(PREF_KEY, JSON.stringify({ ptt: S.ptt, proximity: S.proximity }));

  // ================= UI =================
  const nameIn = el('input', { type: 'text', id: 'mpName', maxLength: 18, value: S.name, placeholder: 'Your name', autocomplete: 'off' });
  const codeIn = el('input', { type: 'text', id: 'mpCode', maxLength: 5, placeholder: 'CODE', autocomplete: 'off', spellcheck: false });
  const note = el('p', { className: 'note', id: 'mpNote' });
  const btnHostNew = el('button', { id: 'mpHostNew', textContent: 'Host a new game' });
  const btnHostSave = el('button', { id: 'mpHostSave', textContent: 'Host from my save' });
  const btnJoin = el('button', { id: 'mpJoin', textContent: 'Join' });
  const manOffer = el('textarea', { id: 'mpManOffer', placeholder: 'Paste the invite the host sent you' });
  const btnManReply = el('button', { id: 'mpManReply', className: 'mp-small', textContent: 'Make my reply' });
  const manReply = el('textarea', { id: 'mpManReplyOut', readOnly: true, placeholder: 'Your reply appears here: send it to the host' });
  const btnManCopy = el('button', { className: 'mp-small', textContent: 'Copy reply' });
  const btnHostManual = el('button', { id: 'mpHostManual', className: 'mp-small', textContent: 'Host with copy-paste invites only' });
  const manual = el('details', { className: 'mp-manual' }, [el('summary', { textContent: 'No code? Connect by copy-paste' }),
    el('span', { className: 'note', textContent: 'Without the signaling server: the host makes an invite in their pause menu, you paste it here, then send your reply back.' }),
    manOffer, btnManReply, manReply, btnManCopy, btnHostManual]);
  const mpScreen = el('div', { id: 'mp', className: 'screen dim hidden' }, [el('div', { className: 'menu' }, [
    el('h2', { textContent: 'Multiplayer' }),
    el('p', { className: 'tag', textContent: 'Explore the house together. One of you hosts; the others join with the host’s code.' }),
    el('label', {}, ['Your name', nameIn]),
    el('p', { className: 'mp-sep', textContent: 'host' }), btnHostNew, btnHostSave,
    el('p', { className: 'mp-sep', textContent: 'join' }), el('div', { className: 'mp-row' }, [codeIn, btnJoin]),
    manual, note, el('button', { id: 'mpBack', textContent: 'Back', onclick: () => closeMenu() }),
  ])]);
  document.body.appendChild(mpScreen);
  nameIn.addEventListener('input', () => { S.name = nameIn.value.trim().slice(0, 18) || S.name; store.set(NAME_KEY, S.name); });
  codeIn.addEventListener('input', () => { codeIn.value = cleanCode(codeIn.value); });
  codeIn.addEventListener('keydown', e => { if (e.key === 'Enter') joinCode(codeIn.value); });
  for (const i of [nameIn, codeIn, manOffer]) i.addEventListener('keydown', e => e.stopPropagation());

  const hud = el('div', { id: 'mpHud', className: 'hidden' });
  const chatLog = el('div', { id: 'mpChatLog' });
  const chatIn = el('input', { id: 'mpChatInput', type: 'text', maxLength: 300, className: 'hidden', placeholder: 'Say something (Enter to send, Esc to close)', autocomplete: 'off' });
  const chatBox = el('div', { id: 'mpChat', className: 'hidden' }, [chatLog, chatIn]);
  document.body.append(hud, chatBox);

  // multiplayer box in the pause menu
  const pVoice = el('button', { id: 'mpVoiceBtn', className: 'mp-small' });
  const pMute = el('button', { id: 'mpMuteBtn', className: 'mp-small' });
  const pPtt = el('input', { type: 'checkbox', id: 'mpPtt' });
  const pProx = el('input', { type: 'checkbox', id: 'mpProx' });
  const pInfo = el('p', { className: 'note' });
  const invOut = el('textarea', { readOnly: true, id: 'mpInviteOut', placeholder: 'Invite code appears here' });
  const invIn = el('textarea', { id: 'mpInviteIn', placeholder: 'Paste the player’s reply here' });
  invIn.addEventListener('keydown', e => e.stopPropagation());
  const invNote = el('p', { className: 'note' });
  const btnInvite = el('button', { className: 'mp-small', id: 'mpInviteMake', textContent: 'Make an invite' });
  const btnInvCopy = el('button', { className: 'mp-small', textContent: 'Copy invite' });
  const btnInvAccept = el('button', { className: 'mp-small', id: 'mpInviteAccept', textContent: 'Connect' });
  const invBox = el('details', { className: 'mp-manual' }, [el('summary', { textContent: 'Invite a player by copy-paste' }), btnInvite, invOut, btnInvCopy, invIn, btnInvAccept, invNote]);
  const pauseBox = el('div', { className: 'mp-pausebox hidden', id: 'mpPause' }, [pInfo, el('div', { className: 'mp-row' }, [pVoice, pMute]),
    el('label', { className: 'check' }, ['Push to talk (hold V)', pPtt]), el('label', { className: 'check' }, ['Voices fade with distance', pProx]),
    el('p', { className: 'note', textContent: 'T chat · V push to talk · M mute' }), invBox]);
  const pauseMenu = document.querySelector('#pause .menu');
  pauseMenu.insertBefore(pauseBox, document.getElementById('btnQuit'));
  pPtt.checked = S.ptt; pProx.checked = S.proximity;
  pPtt.onchange = () => { S.ptt = pPtt.checked; savePrefs(); applyMic(); refreshUi(); };
  pProx.onchange = () => { S.proximity = pProx.checked; savePrefs(); };
  pVoice.onclick = () => (S.mic ? leaveVoice() : joinVoice());
  pMute.onclick = () => { S.muted = !S.muted; applyMic(); refreshUi(); };

  function copyText(ta) {
    ta.select();
    const p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(ta.value) : Promise.reject();
    p.catch(() => { try { document.execCommand('copy'); } catch { /* user copies by hand */ } });
  }
  btnManCopy.onclick = () => copyText(manReply);
  btnInvCopy.onclick = () => copyText(invOut);

  function openMenu() {
    btnHostSave.disabled = !loadSave(); note.textContent = '';
    mpScreen.classList.remove('hidden');
  }
  function closeMenu() { mpScreen.classList.add('hidden'); }
  const busy = on => { for (const b of [btnHostNew, btnHostSave, btnJoin, btnManReply, btnHostManual]) b.disabled = on; if (!on) btnHostSave.disabled = !loadSave(); };

  function refreshUi() {
    const n = (S.role === 'host' ? S.clients.size : remotes.players.size) + 1;
    const voice = !S.mic ? (S.micBlocked ? 'mic blocked (you can still hear)' : 'voice off') : S.muted ? 'muted' : S.ptt ? (S.pttHeld ? '<span class="talk">talking</span>' : 'hold V to talk') : '<span class="talk">mic on</span>';
    const room = S.role === 'host' ? (S.code ? `Room <b>${S.code}</b>` : 'Hosting (copy-paste invites)') : 'Joined';
    hud.innerHTML = `${room} · ${n}/${MAX_PLAYERS} · ${voice}`;
    pInfo.textContent = S.role === 'host' ? (S.code ? `You are hosting. Room code: ${S.code}` : 'You are hosting. Invite players by copy-paste below.') : 'You are playing in someone else’s game.';
    pVoice.textContent = S.mic ? 'Leave voice' : 'Join voice';
    pMute.textContent = S.muted ? 'Unmute' : 'Mute'; pMute.disabled = !S.mic;
    invBox.classList.toggle('hidden', S.role !== 'host');
  }

  // ================= chat =================
  function logLine(text, from, sys) {
    const p = el('p', { className: sys ? 'sys' : '' });
    if (from) p.append(el('b', { textContent: from + ': ' }));
    p.append(document.createTextNode(text));
    chatLog.append(p);
    while (chatLog.children.length > 60) chatLog.firstChild.remove();
    setTimeout(() => p.classList.add('old'), 12000);
    chatLog.scrollTop = chatLog.scrollHeight;
    S.log.push({ from, text, sys: !!sys });
  }
  S.log = [];
  function sendChat(text) {
    text = String(text || '').trim().slice(0, 300); if (!text) return;
    if (S.role === 'host') broadcastChat(S.name, text);
    else if (S.hostLink) S.hostLink.send({ t: 'chat', text });
  }
  function broadcastChat(from, text, sys) {
    logLine(text, from, sys);
    for (const c of S.clients.values()) c.link.send({ t: 'chat', from, text, sys });
  }
  function openChat() {
    if (!S.role || S.chatOpen) return;
    S.chatOpen = true; chatBox.classList.add('open'); chatIn.classList.remove('hidden');
    G.player.enabled = false; G.player.keys = {};
    if (document.pointerLockElement) document.exitPointerLock();
    chatIn.value = ''; chatIn.focus();
  }
  function closeChat(relock = true) {
    if (!S.chatOpen) return;
    S.chatOpen = false; chatBox.classList.remove('open'); chatIn.classList.add('hidden'); chatIn.blur();
    if (G.state === 'playing') { G.player.enabled = true; if (relock) G.lock(); }
  }
  chatIn.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { sendChat(chatIn.value); closeChat(); }
    if (e.key === 'Escape') closeChat();
  });
  chatIn.addEventListener('blur', () => setTimeout(() => { if (S.chatOpen && document.activeElement !== chatIn) closeChat(false); }, 0));

  addEventListener('keydown', e => {
    if (!S.role || S.chatOpen || e.repeat) return;
    if (e.code === 'KeyV' && S.ptt) { S.pttHeld = true; applyMic(); refreshUi(); }
    if (G.state !== 'playing') return;
    if (e.code === 'KeyT' || e.code === 'Enter') { e.preventDefault(); openChat(); }
    if (e.code === 'KeyM' && S.mic) { S.muted = !S.muted; applyMic(); refreshUi(); G.say(S.muted ? 'Microphone muted.' : 'Microphone on.', 1500); }
  });
  addEventListener('keyup', e => { if (e.code === 'KeyV' && S.pttHeld) { S.pttHeld = false; applyMic(); refreshUi(); } });
  addEventListener('blur', () => { if (S.pttHeld) { S.pttHeld = false; applyMic(); refreshUi(); } });
  // autoplay may have blocked a voice until the next click or key
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { for (const o of S.outs.values()) o.retry(); }, true);

  // ================= voice =================
  function applyMic() {
    if (!S.mic) return;
    const on = !S.muted && (!S.ptt || S.pttHeld);
    for (const t of S.mic.getAudioTracks()) t.enabled = on;
  }
  async function joinVoice() {
    if (S.mic) return;
    pVoice.disabled = true;
    try { S.mic = await getMic(); }
    catch (e) { S.micBlocked = true; G.say('Mic blocked: ' + (e && e.name === 'NotAllowedError' ? 'permission was refused.' : (e && e.message) || 'unavailable.') + ' You can still hear the others.', 5000); pVoice.disabled = false; refreshUi(); return; }
    pVoice.disabled = false; S.muted = false; S.micBlocked = false; applyMic();
    const track = S.mic.getAudioTracks()[0];
    if (S.role === 'host') for (const c of S.clients.values()) sendTrackTo(c, 'h', track, S.mic);
    else if (S.hostLink) { S.hostSender = hostVoice().addTrack(track, S.mic); }
    refreshUi();
  }
  function leaveVoice() {
    if (!S.mic) return;
    for (const t of S.mic.getTracks()) t.stop();
    if (S.role === 'host') for (const c of S.clients.values()) dropTrackTo(c, 'h');
    else if (S.hostSender && S.hostVoice) { S.hostVoice.removeTrack(S.hostSender); S.hostSender = null; }
    S.mic = null; refreshUi();
  }
  // host: send one speaker's track to player c, as its own stream so c can tell voices apart
  function sendTrackTo(c, speakerId, track, stream) {
    if (speakerId === c.id || !track) return;
    dropTrackTo(c, speakerId);
    if (!c.voice) c.voice = new VoicePeer(c.link, false, (t) => onHostTrack(c, t));
    if (!stream) { stream = new MediaStream([track]); }
    c.link.send({ t: 'vmap', s: stream.id, id: speakerId });
    c.senders.set(speakerId, c.voice.addTrack(track, stream));
  }
  function dropTrackTo(c, speakerId) { const s = c.senders.get(speakerId); if (s && c.voice) c.voice.removeTrack(s); c.senders.delete(speakerId); }
  function onHostTrack(c, track) {
    c.track = track;
    setOut(c.id, track);
    const stream = new MediaStream([track]);
    for (const d of S.clients.values()) if (d !== c) sendTrackTo(d, c.id, track, stream);
  }
  function hostVoice() {
    if (!S.hostVoice) S.hostVoice = new VoicePeer(S.hostLink, true, (t, stream) => {
      const id = stream && S.vmap.get(stream.id);
      if (id) setOut(id, t); else if (stream) S.pendingTracks.set(stream.id, t);
    });
    return S.hostVoice;
  }
  function setOut(id, track) {
    const old = S.outs.get(id); if (old) old.close();
    S.outs.set(id, new VoiceOut(track));
  }
  function dropOut(id) { const o = S.outs.get(id); if (o) { o.close(); S.outs.delete(id); } }

  // ================= world sync =================
  function worldForWire() {
    const w = G.worldSnapshot();
    w.zone = G.zone; return w;
  }
  function applyFromNet(w, announce = true) {
    const res = G.applyWorld(w);
    if (!announce) return;
    for (const name of res.moths) G.say(`Someone has taken the ${name}. It is in your Moth Journal now.`, 5000);
    if (res.solved) G.say('Somewhere in the house, iron moves. Someone has solved something.', 5000);
  }
  function worldTick() {
    if (!S.role || G.state === 'home') return;
    const w = G.worldSnapshot(), key = sortKey(w);
    if (S.role === 'host') {
      if (key !== S.hostKey || w.lamp !== S.lastLamp) { S.hostKey = key; S.lastLamp = w.lamp; for (const c of S.clients.values()) c.link.send({ t: 'w', w }); }
    } else if (S.hostLink) {
      const lampChanged = S.lastLamp !== null && w.lamp !== S.lastLamp;
      if ((key !== S.hostKey && key !== S.lastSentKey) || lampChanged) {
        const out = { ...w }; if (!lampChanged) delete out.lamp;
        S.hostLink.send({ t: 'w', w: out }); S.lastSentKey = key; S.lastLamp = w.lamp;
      }
    }
  }

  // ================= positions =================
  function myState() {
    const p = G.player;
    return { x: +p.pos.x.toFixed(3), y: +p.y.toFixed(3), z: +p.pos.z.toFixed(3), yaw: +p.yaw.toFixed(3), pitch: +p.pitch.toFixed(3), c: +p.crouchT.toFixed(2), f: G.flashlight.on ? 1 : 0, zn: G.zone, p: G.state === 'paused' ? 1 : 0 };
  }
  function stateTick() {
    if (!S.role || G.state === 'home') return;
    const me = myState();
    if (S.role === 'host') {
      const l = [{ id: 'h', ...me }];
      for (const c of S.clients.values()) if (c.state) l.push({ id: c.id, ...c.state });
      for (const c of S.clients.values()) c.link.send({ t: 'ps', l });
    } else if (S.hostLink) S.hostLink.send({ t: 's', ...me });
  }

  // ================= host =================
  function onClientLink(link) {
    const c = { id: null, name: '?', link, voice: null, senders: new Map(), track: null, state: null };
    link.onmessage = m => {
      if (m.t === 'hello' && !c.id) {
        if (S.clients.size >= MAX_PLAYERS - 1) { link.send({ t: 'full' }); setTimeout(() => link.close(), 500); return; } // host + 3
        c.id = 'p' + S.nextId++; c.name = String(m.name || 'Moth').slice(0, 18);
        const players = [{ id: 'h', name: S.name }, ...[...S.clients.values()].map(o => ({ id: o.id, name: o.name }))];
        S.clients.set(c.id, c); S.names.set(c.id, c.name); remotes.add(c.id, c.name);
        link.send({ t: 'welcome', id: c.id, players, world: worldForWire(), at: myState() });
        for (const o of S.clients.values()) if (o !== c) o.link.send({ t: 'join', id: c.id, name: c.name });
        broadcastChat(null, `${c.name} has come into the house.`, true);
        // voices already in the game
        if (S.mic) sendTrackTo(c, 'h', S.mic.getAudioTracks()[0], S.mic);
        for (const o of S.clients.values()) if (o !== c && o.track && o.track.readyState === 'live') sendTrackTo(c, o.id, o.track);
        refreshUi(); return;
      }
      if (!c.id) return;
      if (m.t === 's') { c.state = m; remotes.setState(c.id, m); }
      else if (m.t === 'w' && m.w) applyFromNet(m.w);
      else if (m.t === 'chat') broadcastChat(c.name, String(m.text || '').slice(0, 300));
      else if (m.t === 'rtc') { if (!c.voice) c.voice = new VoicePeer(link, false, t => onHostTrack(c, t)); c.voice.signal(m); }
    };
    link.onclose = () => {
      if (!c.id || !S.clients.has(c.id)) return;
      S.clients.delete(c.id); remotes.remove(c.id); dropOut(c.id);
      if (c.voice) c.voice.close();
      for (const o of S.clients.values()) { dropTrackTo(o, c.id); o.link.send({ t: 'leave', id: c.id }); }
      broadcastChat(null, `${c.name} has left.`, true);
      refreshUi();
    };
  }

  async function hostGame(fromSave, signaling = 'peer') {
    busy(true);
    let code = null;
    if (signaling === 'peer') {
      note.textContent = 'Asking the signaling server for a room code…';
      try { S.signal = await hostPeer(onClientLink, e => console.warn('[net] signaling', e && e.type)); code = S.signal.code; }
      catch (e) {
        console.warn('[net] host signaling failed', e);
        note.textContent = 'Could not reach the signaling server. You can still host and invite by copy-paste (below).';
        manual.open = true; busy(false); return false;
      }
    }
    S.role = 'host'; S.myId = 'h'; S.code = code; S.blockSave = false;
    start(() => { const s = fromSave && loadSave(); if (s) G.startGame(s.checkpoint, s); else G.startGame(null); });
    logLine(code ? `You are hosting. Room code ${code}. Players join from Multiplayer on their home screen.` : 'You are hosting. Invite players from the pause menu (copy-paste).', null, true);
    busy(false); return code || true;
  }

  // copy-paste invite (host, from the pause menu)
  let pendingInvite = null;
  btnInvite.onclick = async () => {
    btnInvite.disabled = true; invNote.textContent = 'Making an invite…';
    try { if (pendingInvite) pendingInvite.cancel(); pendingInvite = await manualOffer(); invOut.value = pendingInvite.code; invNote.textContent = 'Send this invite to the player, then paste their reply below.'; }
    catch (e) { invNote.textContent = 'Could not make an invite: ' + e.message; }
    btnInvite.disabled = false;
  };
  btnInvAccept.onclick = async () => {
    if (!pendingInvite) { invNote.textContent = 'Make an invite first.'; return; }
    const inv = pendingInvite; invNote.textContent = 'Connecting…';
    try {
      const link = await Promise.race([inv.accept(invIn.value), new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), 15000))]);
      onClientLink(link); pendingInvite = null; invOut.value = invIn.value = ''; invNote.textContent = 'Connected.';
    } catch (e) { invNote.textContent = 'That reply did not work (' + (e.message || e) + '). Make a new invite and try again.'; }
  };
  const makeInvite = async () => { pendingInvite = await manualOffer(); return pendingInvite.code; };
  const acceptInvite = async answer => { const link = await pendingInvite.accept(answer); onClientLink(link); pendingInvite = null; return true; };

  // ================= player =================
  function onHostLink(link) {
    if (S.hostLink && S.hostLink.open) { link.close(); return; } // already in a game
    S.hostLink = link; S.role = 'client'; S.blockSave = true;
    link.onmessage = m => {
      switch (m.t) {
        case 'welcome': {
          S.myId = m.id;
          for (const p of m.players) { S.names.set(p.id, p.name); remotes.add(p.id, p.name); }
          const w = m.world;
          start(() => {
            G.startGame(w.zone === 'exterior' ? null : 'room', { lampLit: w.lamp, solved: w.solved, studySolved: w.study, dinnerSolved: w.dinner, plates: w.plates, doorsOpen: w.doors, altarSolved: w.altar, deskOpen: w.desk, wardOpen: w.ward, moths: w.moths, batteries: w.batteries, lanterns: w.lanterns, cat: w.cat, attic: w.attic, visited: { cellar: true, first: true, catacombs: true, attic: true } });
            const a = m.at; G.setZone(a.zn); G.player.place(a.x + 0.7 * Math.sin(a.yaw + 2), a.z + 0.7 * Math.cos(a.yaw + 2), a.yaw);
            remotes.setState('h', a);
          });
          S.hostKey = sortKey(G.worldSnapshot()); S.lastLamp = w.lamp;
          logLine(`You have joined ${S.names.get('h') || 'the host'}’s game.`, null, true);
          break;
        }
        case 'join': S.names.set(m.id, m.name); remotes.add(m.id, m.name); refreshUi(); break;
        case 'leave': remotes.remove(m.id); dropOut(m.id); refreshUi(); break;
        case 'ps': for (const s of m.l) if (s.id !== S.myId) { if (!remotes.players.has(s.id)) remotes.add(s.id, S.names.get(s.id) || '?'); remotes.setState(s.id, s); } break;
        case 'w': {
          applyFromNet(m.w);
          S.hostKey = sortKey(m.w); S.lastLamp = m.w.lamp;
          break;
        }
        case 'chat': logLine(m.text, m.from, m.sys); break;
        case 'rtc': hostVoice().signal(m); break;
        case 'vmap': {
          S.vmap.set(m.s, m.id);
          const t = S.pendingTracks.get(m.s); if (t) { S.pendingTracks.delete(m.s); setOut(m.id, t); }
          break;
        }
        case 'bye': link.close(); break;
        case 'full': S.hostLink = null; link.onclose = null; link.close(); S.role = null; busy(false); note.textContent = 'Room is full.'; G.say && G.say('Room is full.', 5000); break;
      }
    };
    link.onclose = () => {
      if (S.hostLink !== link) return;
      logLine('The connection to the host is gone. The house is very quiet now.', null, true);
      G.say('You have lost the others. The house is very quiet now.', 6000);
      teardown(true);
    };
    link.send({ t: 'hello', name: S.name });
  }

  async function joinCode(code) {
    code = cleanCode(code);
    if (code.length !== 5) { note.textContent = 'Room codes have five letters or numbers.'; return false; }
    busy(true); note.textContent = 'Looking for the host…';
    try { onHostLink(await joinPeer(code)); note.textContent = 'Connected. Waiting for the host…'; busy(false); return true; }
    catch (e) { note.textContent = (e && e.message) || 'Could not join.'; busy(false); return false; }
  }
  let pendingAnswer = null;
  async function manualJoin(offer) {
    busy(true); note.textContent = 'Making your reply…';
    try {
      if (pendingAnswer) pendingAnswer.cancel();
      const a = pendingAnswer = await manualAnswer(offer);
      manReply.value = a.code; note.textContent = 'Send your reply to the host. You will join as soon as they paste it.';
      busy(false);
      a.link.then(link => { if (pendingAnswer === a) { pendingAnswer = null; onHostLink(link); } });
      return a.code;
    } catch (e) { note.textContent = 'That invite did not work. Ask the host for a new one.'; busy(false); return null; }
  }
  btnHostNew.onclick = () => hostGame(false);
  btnHostSave.onclick = () => hostGame(true);
  btnHostManual.onclick = () => hostGame(!!loadSave() && confirm('Continue from your save? (Cancel starts a new game.)'), 'manual');
  btnJoin.onclick = () => joinCode(codeIn.value);
  btnManReply.onclick = () => manualJoin(manOffer.value);

  // ================= lifecycle =================
  let timers = [], raf = 0, lastT = 0;
  function start(begin) {
    closeMenu(); hud.classList.remove('hidden'); chatBox.classList.remove('hidden'); pauseBox.classList.remove('hidden');
    begin();
    refreshUi();
    joinVoice(); // voice is on by default: ask for the mic straight away, open mic, unmuted
    timers = [setInterval(stateTick, 1000 / STATE_HZ), setInterval(worldTick, WORLD_MS)];
    lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function frame(t) {
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    remotes.update(dt, G.zone);
    for (const [id, o] of S.outs) {
      if (!S.proximity) { o.volume = 1; continue; }
      const d = remotes.distanceTo(id, G.player.pos), other = remotes.zoneOf(id) !== G.zone;
      // close voices are clear; far ones thin out to a whisper, and through walls to nothing
      o.volume = other ? 0.04 : d < 3 ? 1 : Math.max(0.04, 1 - (d - 3) / 22);
    }
    if (S.role) raf = requestAnimationFrame(frame);
  }
  function teardown(keepPlaying = false) {
    timers.forEach(clearInterval); timers = []; cancelAnimationFrame(raf);
    if (S.mic) leaveVoice();
    for (const c of S.clients.values()) { c.link.send({ t: 'bye' }); c.link.close(); if (c.voice) c.voice.close(); }
    S.clients.clear();
    if (S.hostLink) { const l = S.hostLink; S.hostLink = null; l.close(); }
    if (S.hostVoice) { S.hostVoice.close(); S.hostVoice = null; }
    if (S.signal) { S.signal.close(); S.signal = null; }
    for (const id of [...S.outs.keys()]) dropOut(id);
    S.vmap.clear(); S.pendingTracks.clear(); remotes.clear();
    S.role = null; S.code = null; S.hostKey = S.lastSentKey = null; S.lastLamp = null;
    closeChat(false);
    hud.classList.add('hidden'); pauseBox.classList.add('hidden');
    if (!keepPlaying) { chatBox.classList.add('hidden'); chatLog.textContent = ''; S.blockSave = false; }
  }
  document.getElementById('btnQuit').addEventListener('click', () => { teardown(); S.blockSave = false; });
  addEventListener('pagehide', () => teardown());

  return {
    openMenu, closeMenu, hostGame, joinCode, manualJoin, makeInvite, acceptInvite, sendChat, joinVoice, leaveVoice, leave: () => teardown(),
    remotes,
    get active() { return !!S.role; },
    get isClient() { return S.blockSave; },
    get chatOpen() { return S.chatOpen; },
    get role() { return S.role; }, get code() { return S.code; }, get myId() { return S.myId; },
    get log() { return S.log.slice(); },
    get voices() { return [...S.outs.keys()]; },
    get players() { return [...remotes.players.values()].map(p => ({ id: p.id, name: p.name, x: p.target.x, z: p.target.z, zone: p.zone, flash: p.flash, crouch: p.crouch })); },
  };
}
