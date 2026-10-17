// Voice chat. One extra RTCPeerConnection per link (host <-> player) carries audio only,
// negotiated over the game link with the "perfect negotiation" pattern so either side can
// add or drop tracks at any time. The host forwards each player's microphone track to the
// other players, so every voice arrives as its own track and gets its own (proximity) volume.
import { ICE } from './link.js';
import { voiceVolume } from '../audio/core.js'; // Settings: Master x Voice chat volume

export class VoicePeer {
  constructor(link, polite, onTrack) {
    this.link = link; this.polite = polite;
    this.making = false; this.ignore = false;
    const pc = this.pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onnegotiationneeded = async () => {
      try {
        this.making = true;
        await pc.setLocalDescription(await pc.createOffer());
        link.send({ t: 'rtc', d: pc.localDescription.toJSON() });
      } catch (e) { console.warn('[voice] negotiation', e); } finally { this.making = false; }
    };
    pc.onicecandidate = e => { if (e.candidate) link.send({ t: 'rtc', c: e.candidate.toJSON() }); };
    pc.ontrack = e => onTrack(e.track, e.streams[0] || null);
  }
  async signal(m) {
    const pc = this.pc;
    try {
      if (m.d) {
        const collision = m.d.type === 'offer' && (this.making || pc.signalingState !== 'stable');
        this.ignore = !this.polite && collision;
        if (this.ignore) return;
        if (collision) await pc.setLocalDescription({ type: 'rollback' });
        await pc.setRemoteDescription(m.d);
        if (m.d.type === 'offer') {
          await pc.setLocalDescription(await pc.createAnswer());
          this.link.send({ t: 'rtc', d: pc.localDescription.toJSON() });
        }
      } else if (m.c) {
        try { await pc.addIceCandidate(m.c); } catch (e) { if (!this.ignore) throw e; }
      }
    } catch (e) { console.warn('[voice] signal', e); }
  }
  addTrack(track, stream) { return this.pc.addTrack(track, stream); }
  removeTrack(sender) { try { this.pc.removeTrack(sender); } catch { /* closed */ } }
  close() { try { this.pc.close(); } catch { /* closed */ } }
}

// Playback for one remote voice. An <audio> element plays in every browser (Web Audio
// sources from remote WebRTC streams are silent in some Chrome versions).
export class VoiceOut {
  constructor(track) {
    this.el = document.createElement('audio');
    this.el.autoplay = true; this.el.playsInline = true;
    this.el.srcObject = new MediaStream([track]);
    document.body.appendChild(this.el);
    const p = this.el.play(); if (p && p.catch) p.catch(() => { /* retried on the next user gesture */ });
  }
  set volume(v) { this.el.volume = Math.max(0, Math.min(1, v * voiceVolume())); }
  retry() { if (this.el.paused) { const p = this.el.play(); if (p && p.catch) p.catch(() => {}); } }
  close() { this.el.srcObject = null; this.el.remove(); }
}

export async function getMic() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('This browser has no microphone access here (it needs https or localhost).');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
  return stream;
}
