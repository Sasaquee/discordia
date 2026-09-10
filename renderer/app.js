/* =========================================================
   Discordia - renderer
   Voz + video + compartilhamento de tela com audio (WebRTC mesh)
   ========================================================= */
'use strict';

const API = window.discordia;

// ---------------------------------------------------------
// Icones (inline, sem dependencias)
// ---------------------------------------------------------
const ICON = {
  mic: '<svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/><path d="M18 11a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V19H8a1 1 0 1 0 0 2h8a1 1 0 0 0 0-2h-3v-2.09A6 6 0 0 0 18 11z"/></svg>',
  micOff: '<svg viewBox="0 0 24 24"><path d="M15 10.6V6a3 3 0 0 0-5.9-.7l5.9 5.3zM4.4 3 3 4.4l6 5.4V12a3 3 0 0 0 4.5 2.6l1.2 1.1A5.9 5.9 0 0 1 6 11a1 1 0 1 0-2 0 8 8 0 0 0 7 7.9V19H8a1 1 0 1 0 0 2h8a1 1 0 0 0 .9-1.4L19.6 22 21 20.6 4.4 3zm13.4 8.4A6 6 0 0 1 17 14l1.5 1.4A8 8 0 0 0 20 11a1 1 0 1 0-2 0z"/></svg>',
  spk: '<svg viewBox="0 0 24 24"><path d="M5 9v6h3.5l4.5 4V5L8.5 9H5z"/><path d="M16.5 8.5a1 1 0 0 0-1.4 1.4 3 3 0 0 1 0 4.2 1 1 0 1 0 1.4 1.4 5 5 0 0 0 0-7zM19 6a1 1 0 0 0-1.4 1.4 6.5 6.5 0 0 1 0 9.2A1 1 0 0 0 19 18a8.5 8.5 0 0 0 0-12z"/></svg>',
  spkOff: '<svg viewBox="0 0 24 24"><path d="M5 9v6h3.5l4.5 4V5L8.5 9H5z"/><path d="M21 9.4 19.6 8 17.5 10.1 15.4 8 14 9.4l2.1 2.1L14 13.6 15.4 15l2.1-2.1 2.1 2.1 1.4-1.4-2.1-2.1L21 9.4z"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><path d="M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm14 4.5 4-2.5v8l-4-2.5v-3z"/></svg>',
  camOff: '<svg viewBox="0 0 24 24"><path d="M3.3 2 2 3.3 4.7 6H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10c.3 0 .6-.1.9-.2l3.8 3.9 1.4-1.4L3.3 2zM16 8.9V8a2 2 0 0 0-2-2H8.9l7.1 7.1V8.9zm2 1.6v3l4 2.5V8l-4 2.5z"/></svg>',
  screen: '<svg viewBox="0 0 24 24"><path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7v2h3a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h3v-2H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm9 3-4 4h2.5v3h3v-3H16l-4-4z"/></svg>',
  screenOff: '<svg viewBox="0 0 24 24"><path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7v2h3a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h3v-2H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm5.7 3.3L7.3 8.7 10.6 12l-3.3 3.3 1.4 1.4L12 13.4l3.3 3.3 1.4-1.4L13.4 12l3.3-3.3-1.4-1.4L12 10.6 8.7 7.3z"/></svg>',
  leave: '<svg viewBox="0 0 24 24"><path d="M12 3c-3 0-5.9.6-8.4 1.8A2.7 2.7 0 0 0 2 7.3v2A1.7 1.7 0 0 0 3.7 11h2.1a1.7 1.7 0 0 0 1.7-1.6l.1-1.5c2.9-.7 5.9-.7 8.8 0l.1 1.5A1.7 1.7 0 0 0 18.2 11h2.1A1.7 1.7 0 0 0 22 9.3v-2c0-1-.6-2-1.6-2.5A20 20 0 0 0 12 3z"/><path d="M12 13a1 1 0 0 1 1 1v4.6l1.3-1.3a1 1 0 0 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4l1.3 1.3V14a1 1 0 0 1 1-1z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/><path d="m19.4 13-.1-1 .1-1 1.6-1.2a.8.8 0 0 0 .2-1l-1.6-2.6a.8.8 0 0 0-.9-.3l-1.9.7a7 7 0 0 0-1.7-1l-.3-2a.8.8 0 0 0-.8-.6h-3a.8.8 0 0 0-.8.7l-.3 2a7 7 0 0 0-1.7 1l-1.9-.8a.8.8 0 0 0-.9.3L2.8 8.8a.8.8 0 0 0 .2 1L4.6 11l-.1 1 .1 1L3 14.2a.8.8 0 0 0-.2 1l1.5 2.6c.2.3.6.4.9.3l1.9-.7c.5.4 1.1.7 1.7 1l.3 2c0 .3.4.6.8.6h3c.4 0 .7-.3.8-.7l.3-2a7 7 0 0 0 1.7-1l1.9.8c.3.1.7 0 .9-.3l1.5-2.6a.8.8 0 0 0-.2-1L19.4 13z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M5 9v6h3.5l4.5 4V5L8.5 9H5z"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M3.3 2 2 3.3l3.2 3.2A13 13 0 0 0 1 12c1.7 3.9 6 7 11 7 2 0 3.9-.5 5.5-1.3l3.2 3.2 1.3-1.3L3.3 2zm8.7 14.5c-2.5 0-4.5-2-4.5-4.5 0-.6.1-1.2.4-1.7l1.6 1.6a2.5 2.5 0 0 0 2.6 2.6l1.6 1.6c-.5.3-1.1.4-1.7.4zm0-9c2.5 0 4.5 2 4.5 4.5 0 .5-.1 1-.3 1.5l2.9 2.9A13 13 0 0 0 23 12c-1.7-3.9-6-7-11-7-1.2 0-2.3.2-3.4.5l2.2 2.2c.4-.1.8-.2 1.2-.2z"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"/></svg>',
  image: '<svg viewBox="0 0 24 24"><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 13.5L9 12l3 3.5L15 12l4 5.5V6H5v11.5zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>',
  smile: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 18a6 6 0 0 1-5.2-3h10.4A6 6 0 0 1 12 18z"/></svg>',
  sticker: '<svg viewBox="0 0 24 24"><path d="M13 2a9 9 0 0 0-9 9v2a9 9 0 0 0 9 9c.5 0 1 0 1.4-.1V16a2 2 0 0 1 2-2h4.5c.1-.5.1-1 .1-1.5A9 9 0 0 0 13 2zm3.5 14h4l-4.5 4.5V16h.5z"/></svg>',
  board: '<svg viewBox="0 0 24 24"><path d="M12 3a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1 1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 7a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1zm8 0a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1zM4 10a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1zm16 0a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.4-8 5.3V22h16v-2.7c0-2.9-3.6-5.3-8-5.3z"/></svg>',
};

// ---------------------------------------------------------
// Estado
// ---------------------------------------------------------
const S = {
  ws: null,
  selfId: null,
  name: 'Usuario',
  serverUrl: '',
  serverName: 'Servidor',
  room: null,
  connected: false,
  muted: false,
  deafened: false,
  sharing: false,
  camOn: false,
  peers: new Map(),      // id -> peer
  rooms: [],
  micStream: null,       // stream processado (com ganho) que vai pros peers
  rawMic: null,          // stream cru do getUserMedia
  micTrack: null,
  screenStream: null,
  camStream: null,
  audioCtx: null,
  micGain: null,
  micAnalyser: null,
  selfLevel: 0,
  speaking: false,
  focusKey: null,
  reconnectTries: 0,
  micDest: null,         // destino WebAudio: microfone + efeitos sonoros
  fullscreen: false,
  ctxMenu: null,
  settings: {
    name: '', avatar: '', server: 'ws://localhost:45070', micId: '', spkId: '', camId: '',
    volIn: 100, volOut: 100, echo: true, sounds: true, minimizeToTray: false,
    volumes: {},           // volume individual por pessoa/tela (0-200)
    layout: 'auto',        // auto | grade | foco
    tileSize: 300,         // largura minima de cada quadro, em px
    hideEmpty: false,      // esconder quadros de quem esta sem video
    giphyKey: '',          // chave da API do Giphy (opcional)
  },
};

let DEFAULT_PORT = 45070; // sobrescrito pelo main no boot

const RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ],
  iceCandidatePoolSize: 2,
};

// ---------------------------------------------------------
// Utilidades
// ---------------------------------------------------------
const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

function initials(name) {
  const p = String(name || '?').trim().split(/\s+/);
  return ((p[0]?.[0] || '?') + (p[1]?.[0] || '')).toUpperCase();
}
function hueOf(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}
/** Foto de perfil da pessoa, ou as iniciais coloridas quando nao tem foto. */
function avatarOf(id) {
  if (id === S.selfId) return S.settings.avatar || '';
  const p = S.peers.get(id);
  return (p && p.avatar) || '';
}
function avatarEl(name, id, cls) {
  const h = hueOf(id || name);
  const a = el('div', 'avatar' + (cls ? ' ' + cls : ''));
  const foto = avatarOf(id);
  if (foto) {
    const img = document.createElement('img');
    img.src = foto;
    img.alt = '';
    a.appendChild(img);
    a.classList.add('has-photo');
  } else {
    a.textContent = initials(name);
  }
  a.style.setProperty('--a1', `hsl(${h} 72% 64%)`);
  a.style.setProperty('--a2', `hsl(${(h + 40) % 360} 68% 46%)`);
  return a;
}
function toast(msg, kind) {
  const t = el('div', 'toast' + (kind ? ' ' + kind : ''), msg);
  $('toasts').appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .2s, transform .2s';
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    setTimeout(() => t.remove(), 220);
  }, 3600);
}
const hhmm = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// ---------------------------------------------------------
// Sons (gerados no WebAudio, sem arquivos)
// ---------------------------------------------------------
function beep(freqs, dur = 0.12, gain = 0.06) {
  if (!S.settings.sounds) return;
  try {
    const ctx = ensureAudioCtx();
    let t = ctx.currentTime;
    for (const f of freqs) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(saidaAudio());
      o.start(t);
      o.stop(t + dur + 0.02);
      t += dur * 0.8;
    }
  } catch { /* som e opcional */ }
}
const sfx = {
  join: () => beep([523, 784], 0.11),
  leave: () => beep([659, 392], 0.13),
  mute: () => beep([420], 0.07, 0.05),
  unmute: () => beep([680], 0.07, 0.05),
  msg: () => beep([880], 0.06, 0.035),
};

function ensureAudioCtx() {
  if (!S.audioCtx || S.audioCtx.state === 'closed') {
    S.audioCtx = new AudioContext();
    S.saidaMix = null;
  }
  if (S.audioCtx.state === 'suspended') S.audioCtx.resume();
  if (!S.saidaMix) {
    // Tudo que o app toca passa por este no. Ele e a referencia usada para tirar
    // as vozes da chamada do audio capturado da tela (ver eco-worklet.js).
    S.saidaMix = S.audioCtx.createGain();
    S.saidaMix.connect(S.audioCtx.destination);
    S.audioCtx.audioWorklet.addModule('eco-worklet.js').catch(() => {});
  }
  return S.audioCtx;
}

/** Saida audivel do app (nunca ligue nada direto no ctx.destination). */
function saidaAudio() {
  ensureAudioCtx();
  return S.saidaMix;
}

// ---------------------------------------------------------
// Preferencias
// ---------------------------------------------------------
async function loadSettings() {
  const saved = await API.getSettings();
  S.settings = { ...S.settings, ...saved };
  S.name = S.settings.name || '';
  $('inpName').value = S.settings.name || '';
  $('inpServer').value = S.settings.server || 'ws://localhost:45070';
  $('volIn').value = S.settings.volIn;
  $('volOut').value = S.settings.volOut;
  $('volInVal').textContent = S.settings.volIn + '%';
  $('volOutVal').textContent = S.settings.volOut + '%';
  $('optEcho').checked = !!S.settings.echo;
  $('optSounds').checked = !!S.settings.sounds;
  $('optTray').checked = !!S.settings.minimizeToTray;
}
function saveSettings(patch) {
  S.settings = { ...S.settings, ...patch };
  API.setSettings(S.settings);
}

// ---------------------------------------------------------
// Microfone
// ---------------------------------------------------------
async function startMic() {
  if (S.micStream) return S.micStream;
  const constraints = {
    audio: {
      deviceId: S.settings.micId ? { exact: S.settings.micId } : undefined,
      echoCancellation: !!S.settings.echo,
      noiseSuppression: !!S.settings.echo,
      autoGainControl: !!S.settings.echo,
      channelCount: 1,
    },
    video: false,
  };
  let raw;
  try {
    raw = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    // tenta de novo sem o deviceId travado
    try {
      raw = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e2) {
      toast('Nao consegui acessar o microfone: ' + e2.message, 'err');
      return null;
    }
  }
  S.rawMic = raw;

  const ctx = ensureAudioCtx();
  const src = ctx.createMediaStreamSource(raw);
  const gain = ctx.createGain();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  const dest = ctx.createMediaStreamDestination();
  src.connect(gain);
  gain.connect(analyser);
  gain.connect(dest);

  S.micGain = gain;
  S.micAnalyser = analyser;
  S.micDest = dest;   // a soundboard entra aqui, depois do ganho do microfone
  S.micStream = dest.stream;
  S.micTrack = dest.stream.getAudioTracks()[0];
  // O mudo e feito no ganho, nao desligando a faixa: assim os efeitos sonoros
  // continuam saindo para a galera mesmo com o microfone fechado (como no Discord).
  S.micTrack.enabled = true;
  applyMicEnabled();
  return S.micStream;
}

function stopMic() {
  if (S.rawMic) S.rawMic.getTracks().forEach((t) => t.stop());
  S.rawMic = null;
  S.micStream = null;
  S.micTrack = null;
  S.micGain = null;
  S.micDest = null;
  S.micAnalyser = null;
}

function applyMicEnabled() {
  if (S.micGain) {
    const aberto = !S.muted && !S.deafened;
    S.micGain.gain.value = aberto ? S.settings.volIn / 100 : 0;
  }
}

// medidor de nivel (VAD) -> anel de "falando"
function levelOf(analyser, buf) {
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

function startLevelLoop() {
  const bufs = new WeakMap();
  const tick = () => {
    // proprio microfone
    if (S.micAnalyser) {
      let b = bufs.get(S.micAnalyser);
      if (!b) { b = new Uint8Array(S.micAnalyser.fftSize); bufs.set(S.micAnalyser, b); }
      const lv = levelOf(S.micAnalyser, b);
      S.selfLevel = lv;
      const sp = lv > 0.035 && !S.muted && !S.deafened;
      if (sp !== S.speaking) {
        S.speaking = sp;
        markSpeaking(S.selfId, sp);
      }
      const meter = $('micMeter');
      if (meter && !$('settingsModal').classList.contains('hidden')) {
        meter.style.width = Math.min(100, lv * 320) + '%';
      }
    }
    // pares
    for (const p of S.peers.values()) {
      if (!p.analyser) continue;
      let b = bufs.get(p.analyser);
      if (!b) { b = new Uint8Array(p.analyser.fftSize); bufs.set(p.analyser, b); }
      const lv = levelOf(p.analyser, b);
      const sp = lv > 0.035 && !p.muted;
      if (sp !== p.speaking) {
        p.speaking = sp;
        markSpeaking(p.id, sp);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function markSpeaking(id, on) {
  document.querySelectorAll(`[data-speak="${id}"]`).forEach((n) => n.classList.toggle('speaking', on));
}

// ---------------------------------------------------------
// Conexao com o servidor
// ---------------------------------------------------------
function normalizeUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (!/^wss?:\/\//i.test(u)) {
    u = u.replace(/^https?:\/\//i, '');
    u = 'ws://' + u;
  }
  if (!/:\d+(\/|$)/.test(u)) u += ':' + DEFAULT_PORT;
  return u.replace(/\/+$/, '');
}

function connect(url, { silent = false } = {}) {
  return new Promise((resolve, reject) => {
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      return reject(e);
    }
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error('tempo esgotado'));
    }, 8000);

    ws.onopen = () => {
      clearTimeout(timer);
      S.ws = ws;
      S.serverUrl = url;
      S.connected = true;
      S.reconnectTries = 0;
      send({ type: 'identify', name: S.name, avatar: S.settings.avatar || '' });
      setStatus('conectado', 'on');
      resolve(ws);
    };
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      handleMessage(msg);
    };
    ws.onerror = () => { clearTimeout(timer); };
    ws.onclose = () => {
      clearTimeout(timer);
      if (S.ws === ws) {
        S.connected = false;
        setStatus('desconectado', 'off');
        onDisconnected(silent);
      }
      reject(new Error('conexao fechada'));
    };
  });
}

function send(msg) {
  if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(msg));
}

function setStatus(text, cls) {
  const n = $('tbStatus');
  n.textContent = text;
  n.className = 'tb-status ' + (cls || '');
}

function onDisconnected(silent) {
  const wasInApp = !$('appScreen').classList.contains('hidden');
  teardownAll();
  if (wasInApp) {
    toast('Conexao com o servidor caiu.', 'err');
    showConnect('Voce foi desconectado do servidor.');
  } else if (!silent) {
    setConnectMsg('Nao foi possivel conectar.', 'err');
  }
}

// ---------------------------------------------------------
// Mensagens do servidor
// ---------------------------------------------------------
function handleMessage(msg) {
  switch (msg.type) {
    case 'hello':
      S.selfId = msg.id;
      S.serverName = msg.serverName || 'Servidor';
      break;

    case 'rooms':
      S.rooms = msg.rooms || [];
      if (msg.serverName) S.serverName = msg.serverName;
      $('serverName').textContent = S.serverName;
      renderRooms();
      break;

    case 'joined': {
      S.room = msg.room;
      $('stageRoom').textContent = msg.room;
      $('chatLog').innerHTML = ''; // o historico da sala chega logo em seguida
      for (const p of msg.peers) addPeer(p, true);
      renderRooms();
      updateControlUI();
      renderStage();
      sfx.join();
      break;
    }

    case 'left':
      sysMsg(`Voce saiu de ${msg.room || ''}`);
      S.room = null;
      $('stageRoom').textContent = 'nenhuma sala';
      clearPeers();
      renderRooms();
      updateControlUI();
      renderStage();
      break;

    case 'peer-join':
      addPeer(msg.peer, false);
      sysMsg(`${msg.peer.name} entrou na sala`);
      sfx.join();
      renderStage();
      break;

    case 'peer-leave': {
      const p = S.peers.get(msg.id);
      if (p) {
        sysMsg(`${p.name} saiu da sala`);
        removePeer(msg.id);
        sfx.leave();
        renderStage();
      }
      break;
    }

    case 'peer-state': {
      const p = S.peers.get(msg.peer.id);
      if (p) {
        Object.assign(p, msg.peer);
        syncPeerMedia(p);
        renderStage();
        renderRooms();
      }
      break;
    }

    case 'history': {
      // conversa antiga da sala, guardada por quem hospeda
      const log = $('chatLog');
      log.innerHTML = '';
      for (const m of msg.mensagens || []) addChat(m, { historico: true });
      if ((msg.mensagens || []).length) sysMsg('--- fim do historico ---');
      sysMsg('Voce entrou em ' + msg.room);
      break;
    }

    case 'signal':
      handleSignal(msg.from, msg.data);
      break;

    case 'chat':
      addChat(msg);
      if (msg.from !== S.selfId) sfx.msg();
      break;

    case 'pong': {
      const ms = Date.now() - msg.t;
      const pill = $('latency');
      pill.textContent = ms + ' ms';
      pill.className = 'pill ' + (ms < 120 ? 'good' : ms < 300 ? '' : 'bad');
      break;
    }
  }
}

// ---------------------------------------------------------
// Pares / WebRTC
// ---------------------------------------------------------
/**
 * Opus vai para mono e ~32 kbps por padrao, o que estraga o audio de jogo/musica
 * do compartilhamento de tela. Aqui pedimos estereo e mais banda.
 */
function tuneOpus(sdp) {
  if (!sdp) return sdp;
  const linhas = sdp.split(/\r\n|\n/);
  const opusPts = new Set();
  for (const l of linhas) {
    const m = /^a=rtpmap:(\d+)\s+opus\//i.exec(l);
    if (m) opusPts.add(m[1]);
  }
  if (!opusPts.size) return sdp;

  const extras = 'stereo=1;sprop-stereo=1;maxaveragebitrate=160000;useinbandfec=1';
  const comFmtp = new Set();
  for (const l of linhas) {
    const m = /^a=fmtp:(\d+)\s/.exec(l);
    if (m && opusPts.has(m[1])) comFmtp.add(m[1]);
  }

  const out = [];
  for (const l of linhas) {
    const f = /^a=fmtp:(\d+)\s+(.*)$/.exec(l);
    if (f && opusPts.has(f[1])) {
      out.push(f[2].includes('stereo=') ? l : `a=fmtp:${f[1]} ${f[2]};${extras}`);
      continue;
    }
    out.push(l);
    const r = /^a=rtpmap:(\d+)\s+opus\//i.exec(l);
    if (r && !comFmtp.has(r[1])) out.push(`a=fmtp:${r[1]} ${extras}`); // payload sem fmtp proprio
  }
  return out.join('\r\n');
}

/**
 * Poe o H264 na frente em todas as trilhas de video da conexao.
 * O H264 costuma usar o codificador do hardware e segura 1080p60 muito melhor que
 * o VP8 por software (que cai para ~960x540@18fps). Precisa ser pedido pelos DOIS
 * lados: quem responde a negociacao tambem escolhe o codec.
 */
function preferirH264(pc) {
  try {
    const caps = RTCRtpSender.getCapabilities('video');
    if (!caps) return;
    const h264 = caps.codecs.filter((c) => /h264/i.test(c.mimeType));
    if (!h264.length) return;
    const resto = caps.codecs.filter((c) => !/h264/i.test(c.mimeType));
    for (const tr of pc.getTransceivers()) {
      const tipo = (tr.receiver && tr.receiver.track && tr.receiver.track.kind) ||
        (tr.sender && tr.sender.track && tr.sender.track.kind);
      if (tipo && tipo !== 'video') continue;
      if (tr.setCodecPreferences) tr.setCodecPreferences([...h264, ...resto]);
    }
  } catch { /* navegador sem suporte: segue no codec padrao */ }
}

function newPeer(info) {
  return {
    id: info.id,
    name: info.name,
    avatar: info.avatar || null,
    muted: !!info.muted,
    deafened: !!info.deafened,
    sharing: !!info.sharing,
    screenStreamId: info.screenStreamId || null,
    camStreamId: info.camStreamId || null,
    cam: !!info.cam,
    pc: null,
    polite: S.selfId < info.id,   // ordem estavel entre os dois lados
    makingOffer: false,
    ignoreOffer: false,
    streams: new Map(),
    analyser: null,
    speaking: false,
    senders: [],
  };
}

function addPeer(info, iInitiate) {
  if (S.peers.has(info.id)) return S.peers.get(info.id);
  const p = newPeer(info);
  S.peers.set(info.id, p);
  createPC(p);
  return p;
}

function createPC(p) {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  p.pc = pc;

  // manda o microfone
  if (S.micStream) {
    for (const t of S.micStream.getTracks()) p.senders.push(pc.addTrack(t, S.micStream));
  }
  // se ja estou compartilhando tela/camera, manda tambem
  if (S.screenStream) for (const t of S.screenStream.getTracks()) p.senders.push(pc.addTrack(t, S.screenStream));
  if (S.camStream) for (const t of S.camStream.getTracks()) p.senders.push(pc.addTrack(t, S.camStream));

  preferirH264(pc);

  pc.onicecandidate = (ev) => {
    if (ev.candidate) send({ type: 'signal', to: p.id, data: { candidate: ev.candidate } });
  };

  // Renegociacao: como montamos o offer a mao (para pedir Opus estereo), so da
  // para criar quando a conexao esta estavel. Se nao estiver, fica agendado.
  const negociar = async () => {
    if (pc.signalingState !== 'stable') { p.renegociarDepois = true; return; }
    try {
      p.makingOffer = true;
      const offer = await pc.createOffer();
      offer.sdp = tuneOpus(offer.sdp);
      await pc.setLocalDescription(offer);
      send({ type: 'signal', to: p.id, data: { description: pc.localDescription } });
    } catch (err) {
      // o estado pode mudar durante o await do createOffer: tenta de novo ao estabilizar
      if (err.name === 'InvalidStateError') p.renegociarDepois = true;
      else console.warn('negociacao', err.name, err.message);
    } finally {
      p.makingOffer = false;
    }
  };
  p.negociar = negociar;
  pc.onnegotiationneeded = negociar;

  pc.onsignalingstatechange = () => {
    if (pc.signalingState === 'stable' && p.renegociarDepois) {
      p.renegociarDepois = false;
      negociar();
    }
  };

  pc.ontrack = (ev) => {
    const stream = ev.streams[0];
    if (!stream) return;
    if (!p.streams.has(stream.id)) {
      p.streams.set(stream.id, stream);
      stream.onremovetrack = () => {
        if (!stream.getTracks().length) {
          p.streams.delete(stream.id);
          syncPeerMedia(p);
          renderStage();
        }
      };
    }
    preferirH264(pc);
    syncPeerMedia(p);
    renderStage();
  };

  pc.onconnectionstatechange = () => {
    console.log('[rtc]', p.name, pc.connectionState);
    if (pc.connectionState === 'failed') {
      try { pc.restartIce(); } catch {}
    }
  };
}

async function handleSignal(from, data) {
  let p = S.peers.get(from);
  if (!p) {
    p = addPeer({ id: from, name: 'Usuario' }, false);
  }
  const pc = p.pc;
  try {
    if (data.description) {
      const desc = data.description;
      const collision = desc.type === 'offer' && (p.makingOffer || pc.signalingState !== 'stable');
      p.ignoreOffer = !p.polite && collision;
      if (p.ignoreOffer) return;
      if (collision) {
        await Promise.all([
          pc.setLocalDescription({ type: 'rollback' }).catch(() => {}),
          pc.setRemoteDescription(desc),
        ]);
      } else {
        await pc.setRemoteDescription(desc);
      }
      if (desc.type === 'offer') {
        const answer = await pc.createAnswer();
        answer.sdp = tuneOpus(answer.sdp);
        await pc.setLocalDescription(answer);
        send({ type: 'signal', to: from, data: { description: pc.localDescription } });
      }
    } else if (data.candidate) {
      try {
        await pc.addIceCandidate(data.candidate);
      } catch (err) {
        if (!p.ignoreOffer) console.warn('ice', err);
      }
    }
  } catch (err) {
    console.warn('signal', err);
  }
}

/** Classifica os streams do par: microfone -> <audio>, tela/camera -> tiles */
/**
 * Saidas de audio remoto.
 * Cada fonte (microfone de fulano, audio da tela de beltrano) vira um no de ganho
 * proprio, o que permite volume individual e ate amplificar acima de 100% - coisa
 * que um <audio>/<video> sozinho nao faz (volume maximo 1.0).
 *
 * O <audio> mudo continua existindo de proposito: sem um elemento de midia
 * consumindo a stream, o Chromium nao alimenta o WebAudio com audio vindo do WebRTC.
 */
const audioOuts = new Map(); // chave -> { stream, el, src, gain, analyser, peerId, kind }

const outKey = (peerId, kind, streamId) => peerId + ':' + (kind === 'mic' ? 'mic' : streamId);

function playRemote(key, stream, { peerId, kind }) {
  const cur = audioOuts.get(key);
  if (cur && cur.stream === stream) return cur;
  if (cur) stopRemote(key);

  const ctx = ensureAudioCtx();
  const el = document.createElement('audio');
  el.srcObject = stream;
  el.muted = true;          // quem toca de fato e o WebAudio
  el.autoplay = true;
  el.dataset.pump = key;
  document.body.appendChild(el);
  el.play().catch(() => {});

  const src = ctx.createMediaStreamSource(stream);
  const gain = ctx.createGain();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(gain);
  gain.connect(analyser);
  gain.connect(saidaAudio());

  const out = { stream, el, src, gain, analyser, peerId, kind };
  audioOuts.set(key, out);
  applyOutputVolume();
  return out;
}

function stopRemote(key) {
  const o = audioOuts.get(key);
  if (!o) return;
  try { o.src.disconnect(); o.gain.disconnect(); } catch {}
  o.el.srcObject = null;
  o.el.remove();
  audioOuts.delete(key);
}

/** Volume individual (0-200%) por fonte, lembrado entre sessoes. */
function volumeOf(key) {
  const v = S.settings.volumes && S.settings.volumes[key];
  return v == null ? 100 : v;
}
function setVolumeOf(key, value) {
  const volumes = { ...(S.settings.volumes || {}) };
  volumes[key] = Math.max(0, Math.min(200, Math.round(value)));
  saveSettings({ volumes });
  applyOutputVolume();
}

function applyOutputVolume() {
  const master = S.deafened ? 0 : S.settings.volOut / 100;
  for (const [key, o] of audioOuts) {
    const own = volumeOf(o.kind === 'mic' ? o.peerId : key) / 100;
    o.gain.gain.value = master * own;
  }
  applySink();
}

/** Escolhe a saida de audio (WebAudio no Chromium recente aceita setSinkId). */
function applySink() {
  const ctx = S.audioCtx;
  if (!ctx || !S.settings.spkId) return;
  try {
    if (typeof ctx.setSinkId === 'function') ctx.setSinkId(S.settings.spkId).catch(() => {});
  } catch { /* navegador sem suporte: fica na saida padrao */ }
}

/** Liga cada stream recebida no lugar certo: microfone -> audio, tela/camera -> tile. */
function syncPeerMedia(p) {
  const vistos = new Set();
  for (const [id, st] of p.streams) {
    const ehTela = id === p.screenStreamId;
    const ehCam = id === p.camStreamId;
    const temVideo = st.getVideoTracks().length > 0;
    if (!st.getAudioTracks().length) continue;

    const kind = (!temVideo && !ehTela && !ehCam) ? 'mic' : (ehTela ? 'screen' : 'cam');
    const key = outKey(p.id, kind, id);
    vistos.add(key);
    const out = playRemote(key, st, { peerId: p.id, kind });
    if (kind === 'mic') p.analyser = out.analyser;
  }
  // limpa saidas que nao existem mais neste par
  for (const key of [...audioOuts.keys()]) {
    if (key.startsWith(p.id + ':') && !vistos.has(key)) stopRemote(key);
  }
}

function removePeer(id) {
  const p = S.peers.get(id);
  if (!p) return;
  try { p.pc && p.pc.close(); } catch {}
  for (const key of [...audioOuts.keys()]) {
    if (key.startsWith(id + ':')) stopRemote(key);
  }
  for (const key of [...videoTiles.keys()]) {
    if (key.startsWith(id + ':')) {
      videoTiles.get(key).el.remove();
      videoTiles.delete(key);
    }
  }
  S.peers.delete(id);
}

function clearPeers() {
  for (const id of [...S.peers.keys()]) removePeer(id);
  S.focusKey = null;
}

// ---------------------------------------------------------
// Salas
// ---------------------------------------------------------
function joinRoom(name) {
  if (!name) return;
  if (S.room === name) return;
  if (S.room) clearPeers();
  send({ type: 'join', room: name, muted: S.muted, deafened: S.deafened });
}

function leaveRoom() {
  if (!S.room) return;
  if (S.sharing) stopShare();
  if (S.camOn) stopCam();
  clearPeers();
  send({ type: 'leave' });
  sfx.leave();
}

function renderRooms() {
  const list = $('roomList');
  list.innerHTML = '';
  const rooms = [...S.rooms];
  if (!rooms.some((r) => r.name === 'Geral')) rooms.unshift({ name: 'Geral', users: [] });

  for (const r of rooms) {
    const wrap = el('div', 'room' + (r.name === S.room ? ' active' : ''));
    const btn = el('button', 'room-btn');
    btn.innerHTML = `<span class="ic">${ICON.vol}</span><span class="nm"></span>` +
      (r.users.length ? `<span class="cnt">${r.users.length}</span>` : '');
    btn.querySelector('.nm').textContent = r.name;
    btn.onclick = () => joinRoom(r.name);
    btn.oncontextmenu = (e) => { e.preventDefault(); openRoomMenu(r, e.clientX, e.clientY); };
    wrap.appendChild(btn);

    if (r.users.length) {
      const ul = el('div', 'room-users');
      for (const u of r.users) {
        const isSelf = u.id === S.selfId;
        const p = S.peers.get(u.id);
        if (p && u.avatar !== undefined && p.avatar !== u.avatar) p.avatar = u.avatar;
        const row = el('div', 'room-user');
        row.dataset.speak = u.id;
        row.style.cursor = 'pointer';
        row.onclick = () => openProfile(u.id);
        row.oncontextmenu = (e) => { e.preventDefault(); openPeerMenu(u.id, e.clientX, e.clientY); };
        if (!isSelf && volumeOf(u.id) === 0) row.style.opacity = '.55';
        row.appendChild(avatarEl(u.name, u.id, 'sm'));
        const nm = el('span', null);
        nm.textContent = u.name + (isSelf ? ' (voce)' : '');
        row.appendChild(nm);
        const muted = isSelf ? (S.muted || S.deafened) : (p ? p.muted : false);
        if (muted) row.appendChild(el('span', 'mini-ic', ICON.micOff));
        const sharing = isSelf ? S.sharing : (p ? p.sharing : false);
        if (sharing) {
          const sh = el('span', 'mini-ic', ICON.screen);
          sh.style.color = 'var(--good)';
          row.appendChild(sh);
        }
        ul.appendChild(row);
      }
      wrap.appendChild(ul);
    }
    list.appendChild(wrap);
  }
}

// ---------------------------------------------------------
// Palco (participantes + telas)
// ---------------------------------------------------------
const videoTiles = new Map(); // chave -> {el, video, label}
const EMPTY_STATE = $('emptyState'); // guardado: o palco e limpo com innerHTML

/** Barra de volume que aparece ao passar o mouse no quadro de video. */
function volumeUI(key) {
  const box = el('div', 'tile-vol', ICON.vol);
  const range = document.createElement('input');
  range.type = 'range';
  range.min = 0; range.max = 200; range.step = 5;
  range.value = volumeOf(key);
  const val = el('span', 'val', range.value + '%');
  range.oninput = () => {
    val.textContent = range.value + '%';
    setVolumeOf(key, Number(range.value));
  };
  // o clique no slider nao deve focar/desfocar o video
  box.onclick = (e) => e.stopPropagation();
  box.append(range, val);
  return box;
}

function videoTile(key, stream, label, opts = {}) {
  let t = videoTiles.get(key);
  if (!t) {
    const node = el('div', 'tile video-tile');
    const v = document.createElement('video');
    v.autoplay = true;
    v.playsInline = true;
    v.muted = true; // o audio sai pelo WebAudio (volume individual e boost)
    node.appendChild(v);

    const lbl = el('div', 'tile-label');
    node.appendChild(lbl);

    const fit = el('button', 'tile-fit', 'preencher');
    fit.onclick = (e) => {
      e.stopPropagation();
      v.classList.toggle('cover');
      fit.textContent = v.classList.contains('cover') ? 'ajustar' : 'preencher';
    };
    node.appendChild(fit);

    if (!opts.local) node.appendChild(volumeUI(key));

    node.onclick = () => {
      S.focusKey = S.focusKey === key ? null : key;
      if (S.settings.layout === 'grade') saveSettings({ layout: 'auto' });
      renderStage();
    };
    t = { el: node, video: v, label: lbl };
    videoTiles.set(key, t);
  }
  if (t.video.srcObject !== stream) {
    t.video.srcObject = stream;
    t.video.play().catch(() => {});
  }
  t.label.innerHTML = '<span class="live">AO VIVO</span><span class="nm"></span>';
  t.label.querySelector('.nm').textContent = label;
  t.el.classList.toggle('focused', S.focusKey === key);
  return t.el;
}

function personTile(person) {
  const node = el('div', 'tile');
  node.dataset.speak = person.id;
  node.appendChild(avatarEl(person.name, person.id));
  const lbl = el('div', 'tile-label');
  const nm = el('span', 'nm');
  nm.textContent = person.name;
  lbl.appendChild(nm);
  if (person.muted) lbl.appendChild(el('span', 'muted-ic', ICON.micOff));
  node.appendChild(lbl);
  if (person.you) node.appendChild(el('div', 'tile-badge you', 'voce'));
  if (person.speaking) node.classList.add('speaking');
  node.onclick = () => openProfile(person.id);
  node.oncontextmenu = (e) => { e.preventDefault(); openPeerMenu(person.id, e.clientX, e.clientY); };
  return node;
}

/** Videos ativos na sala (meus e dos outros), na ordem em que devem aparecer. */
function activeVideos() {
  const videos = [];
  if (S.screenStream) videos.push({ key: 'self:screen', stream: S.screenStream, label: 'Sua tela', local: true });
  if (S.camStream) videos.push({ key: 'self:cam', stream: S.camStream, label: 'Sua camera', local: true });
  for (const p of S.peers.values()) {
    for (const [sid, st] of p.streams) {
      if (!st.getVideoTracks().length) continue;
      const ehTela = sid === p.screenStreamId;
      videos.push({
        key: p.id + ':' + sid,
        stream: st,
        label: p.name + (ehTela ? ' - tela' : ' - camera'),
        local: false,
      });
    }
  }
  return videos;
}

let assinaturaPalco = '';

function renderStage() {
  const stage = $('stage');
  if (!S.room) {
    assinaturaPalco = '';
    stage.innerHTML = '';
    EMPTY_STATE.classList.remove('hidden');
    stage.appendChild(EMPTY_STATE);
    setControlsEnabled(false);
    return;
  }
  setControlsEnabled(true);
  EMPTY_STATE.classList.add('hidden');

  const videos = activeVideos();
  const people = [{
    id: S.selfId, name: S.name, muted: S.muted || S.deafened, you: true, speaking: S.speaking,
  }];
  for (const p of S.peers.values()) {
    people.push({ id: p.id, name: p.name, muted: p.muted, speaking: p.speaking });
  }

  if (S.focusKey && !videos.some((v) => v.key === S.focusKey)) S.focusKey = null;

  // Reconstruir o palco re-anexa os <video> no DOM e o decodificador engasga.
  // Se nada mudou de fato (so alguem mutou, por exemplo), nao mexe no DOM.
  const assinatura = JSON.stringify([
    S.settings.layout, S.settings.tileSize, S.settings.hideEmpty, S.focusKey,
    videos.map((v) => v.key + '|' + v.label),
    people.map((p) => p.id + '|' + p.name + '|' + (p.muted ? 1 : 0) + '|' + (p.you ? 1 : 0)),
  ]);
  if (assinatura === assinaturaPalco && stage.children.length) return;
  assinaturaPalco = assinatura;

  const layout = S.settings.layout || 'auto';
  const tamanho = S.settings.tileSize || 300;
  const mostrarPessoas = !S.settings.hideEmpty;

  // "auto": foca sozinho quando ha exatamente uma tela/camera rolando
  let foco = null;
  if (layout === 'foco') foco = S.focusKey || (videos[0] && videos[0].key) || null;
  else if (layout === 'auto') foco = S.focusKey || (videos.length === 1 ? videos[0].key : null);

  stage.innerHTML = '';

  const grade = (min) => {
    const g = el('div', 'grid');
    g.style.gridTemplateColumns = `repeat(auto-fit,minmax(${min}px,1fr))`;
    return g;
  };

  if (foco) {
    const principal = videos.find((v) => v.key === foco);
    const g = el('div', 'grid focus-mode');
    g.style.gridTemplateColumns = '1fr';
    g.appendChild(videoTile(principal.key, principal.stream, principal.label, { local: principal.local }));
    stage.appendChild(g);

    const strip = el('div', 'strip');
    strip.style.gridTemplateColumns = `repeat(auto-fit,minmax(${Math.round(tamanho * 0.42)}px,${Math.round(tamanho * 0.5)}px))`;
    for (const v of videos) {
      if (v.key === foco) continue;
      strip.appendChild(videoTile(v.key, v.stream, v.label, { local: v.local }));
    }
    if (mostrarPessoas) for (const per of people) strip.appendChild(personTile(per));
    if (strip.children.length) stage.appendChild(strip);
  } else {
    const g = grade(tamanho);
    for (const v of videos) g.appendChild(videoTile(v.key, v.stream, v.label, { local: v.local }));
    if (mostrarPessoas) for (const per of people) g.appendChild(personTile(per));
    if (!g.children.length) {
      g.appendChild(el('div', 'dock-empty', 'Todos os quadros estao ocultos. Use o botao de olho para mostrar de novo.'));
    }
    stage.appendChild(g);
  }

  // videos movidos no DOM podem pausar; religa
  stage.querySelectorAll('video').forEach((v) => v.play().catch(() => {}));
  syncViewControls();
}

/** Mantem os botoes de layout (normais e da tela cheia) refletindo o estado. */
function syncViewControls() {
  const layout = S.settings.layout || 'auto';
  document.querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === layout);
  });
  $('tileSize').value = S.settings.tileSize;
  $('fsTileSize').value = S.settings.tileSize;
  for (const id of ['btnHideEmpty', 'fsHideEmpty']) {
    const b = $(id);
    b.innerHTML = S.settings.hideEmpty ? ICON.eyeOff : ICON.eye;
    b.classList.toggle('on', !!S.settings.hideEmpty);
  }
}

function setControlsEnabled(on) {
  ['btnMic', 'btnDeaf', 'btnCam', 'btnShare', 'btnBoard', 'btnLeave'].forEach((id) => {
    $(id).disabled = !on;
  });
}

// ---------------------------------------------------------
// Chat
// ---------------------------------------------------------
function addChat(msg) {
  const log = $('chatLog');
  const row = el('div', 'msg');
  row.appendChild(avatarEl(msg.name, msg.from));
  const body = el('div', 'msg-body');
  const head = el('div', 'msg-head');
  const nm = el('span', 'msg-name');
  nm.textContent = msg.name;
  nm.style.color = `hsl(${hueOf(msg.from)} 70% 70%)`;
  const tm = el('span', 'msg-time');
  tm.textContent = hhmm(msg.ts);
  head.append(nm, tm);
  body.appendChild(head);
  if (msg.text) {
    const txt = el('div', 'msg-text');
    txt.textContent = msg.text;
    body.appendChild(txt);
  }
  if (msg.image) {
    const img = document.createElement('img');
    img.className = 'msg-img' + (msg.kind === 'figurinha' ? ' sticker' : '');
    img.src = msg.image;
    img.alt = msg.kind || 'imagem';
    img.loading = 'lazy';
    img.onclick = () => abrirLightbox(msg.image);
    img.onload = () => { log.scrollTop = log.scrollHeight; };
    body.appendChild(img);
  }
  row.appendChild(body);
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function sysMsg(text) {
  const log = $('chatLog');
  const row = el('div', 'msg sys');
  const t = el('div', 'msg-text');
  t.textContent = text;
  row.appendChild(t);
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

// ---------------------------------------------------------
// Microfone / audio - acoes
// ---------------------------------------------------------
function toggleMute() {
  if (!S.room) return;
  S.muted = !S.muted;
  if (!S.muted && S.deafened) S.deafened = false;
  applyMicEnabled();
  applyOutputVolume();
  pushState();
  updateControlUI();
  S.muted ? sfx.mute() : sfx.unmute();
}

function toggleDeafen() {
  if (!S.room) return;
  S.deafened = !S.deafened;
  if (S.deafened) S.muted = true;
  applyMicEnabled();
  applyOutputVolume();
  pushState();
  updateControlUI();
  S.deafened ? sfx.mute() : sfx.unmute();
}

function pushState() {
  send({
    type: 'state',
    muted: S.muted,
    deafened: S.deafened,
    sharing: S.sharing,
    cam: S.camOn,
    screenStreamId: S.screenStream ? S.screenStream.id : null,
    camStreamId: S.camStream ? S.camStream.id : null,
  });
  renderRooms();
}

function updateControlUI() {
  const mic = $('btnMic');
  mic.querySelector('.ci').innerHTML = S.muted ? ICON.micOff : ICON.mic;
  mic.querySelector('.cl').textContent = S.muted ? 'Mudo' : 'Microfone';
  mic.classList.toggle('off', S.muted);
  mic.classList.toggle('active', !S.muted && !!S.room);

  const deaf = $('btnDeaf');
  deaf.querySelector('.ci').innerHTML = S.deafened ? ICON.spkOff : ICON.spk;
  deaf.querySelector('.cl').textContent = S.deafened ? 'Sem som' : 'Audio';
  deaf.classList.toggle('off', S.deafened);

  const cam = $('btnCam');
  cam.querySelector('.ci').innerHTML = S.camOn ? ICON.cam : ICON.camOff;
  cam.querySelector('.cl').textContent = S.camOn ? 'Camera on' : 'Camera';
  cam.classList.toggle('active', S.camOn);

  const sh = $('btnShare');
  sh.querySelector('.ci').innerHTML = S.sharing ? ICON.screenOff : ICON.screen;
  sh.querySelector('.cl').textContent = S.sharing ? 'Parar' : 'Tela';
  sh.classList.toggle('active', S.sharing);

  const bd = $('btnBoard');
  bd.querySelector('.ci').innerHTML = ICON.board;
  bd.querySelector('.cl').textContent = 'Sons';

  $('btnLeave').querySelector('.ci').innerHTML = ICON.leave;

  const mm = $('btnMicMini');
  mm.innerHTML = S.muted ? ICON.micOff : ICON.mic;
  mm.classList.toggle('off', S.muted);
  const dm = $('btnDeafMini');
  dm.innerHTML = S.deafened ? ICON.spkOff : ICON.spk;
  dm.classList.toggle('off', S.deafened);

  // barra da tela cheia espelha os mesmos estados
  const fm = $('fsMic');
  fm.innerHTML = S.muted ? ICON.micOff : ICON.mic;
  fm.classList.toggle('off', S.muted);
  const fd = $('fsDeaf');
  fd.innerHTML = S.deafened ? ICON.spkOff : ICON.spk;
  fd.classList.toggle('off', S.deafened);
  const fsh = $('fsShare');
  fsh.innerHTML = S.sharing ? ICON.screenOff : ICON.screen;
  fsh.classList.toggle('on', S.sharing);

  $('selfState').textContent = !S.room ? 'Disponivel'
    : S.deafened ? 'Sem audio' : S.muted ? 'Microfone mudo' : 'Em ' + S.room;
}

// ---------------------------------------------------------
// Compartilhamento de tela (com audio do sistema)
// ---------------------------------------------------------
let pickerSources = [];
let pickerSel = null;
let pickerTab = 'screen';

async function openPicker() {
  if (S.sharing) return stopShare();
  $('pickerModal').classList.remove('hidden');
  const grid = $('sourceGrid');
  grid.innerHTML = '<div style="color:var(--dim);padding:20px">Carregando telas e janelas...</div>';
  pickerSel = null;
  $('btnStartShare').disabled = true;
  try {
    pickerSources = await API.listSources();
  } catch (e) {
    grid.innerHTML = '<div style="color:var(--danger);padding:20px">Falha ao listar as fontes.</div>';
    return;
  }
  renderPicker();
}

function renderPicker() {
  const grid = $('sourceGrid');
  grid.innerHTML = '';
  const list = pickerSources.filter((s) => s.kind === pickerTab);
  if (!list.length) {
    grid.innerHTML = '<div style="color:var(--dim);padding:20px">Nada por aqui.</div>';
    return;
  }
  for (const s of list) {
    const b = el('button', 'source' + (pickerSel === s.id ? ' sel' : ''));
    const img = document.createElement('img');
    img.src = s.thumbnail || '';
    b.appendChild(img);
    const nm = el('div', 'sname');
    if (s.appIcon) {
      const ic = document.createElement('img');
      ic.src = s.appIcon;
      nm.appendChild(ic);
    }
    const sp = document.createElement('span');
    sp.textContent = s.name;
    nm.appendChild(sp);
    b.appendChild(nm);
    b.onclick = () => {
      pickerSel = s.id;
      $('btnStartShare').disabled = false;
      renderPicker();
    };
    b.ondblclick = () => { pickerSel = s.id; startShare(); };
    grid.appendChild(b);
  }
}

/**
 * Passa o audio capturado da tela pelo cancelador de eco e devolve uma stream com
 * o mesmo video, mas com o audio limpo. Se algo falhar, devolve a stream original -
 * melhor ter eco do que ficar sem o som do jogo.
 */
async function limparEcoDaTela(stream) {
  const faixaAudio = stream.getAudioTracks()[0];
  if (!faixaAudio) return stream;
  try {
    const ctx = ensureAudioCtx();
    await ctx.audioWorklet.addModule('eco-worklet.js');

    const origem = ctx.createMediaStreamSource(new MediaStream([faixaAudio]));
    const no = new AudioWorkletNode(ctx, 'cancelador-eco', {
      numberOfInputs: 2,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
    });
    no.port.onmessage = (e) => {
      if (e.data && e.data.atrasoMs != null) {
        console.log('[eco] atraso medido:', e.data.atrasoMs, 'ms');
      }
      if (e.data && e.data.erle != null) {
        console.log('[eco] reducao:', e.data.erle, 'dB');
      }
    };
    origem.connect(no, 0, 0);
    saidaAudio().connect(no, 0, 1);   // referencia: o que estamos tocando

    const destino = ctx.createMediaStreamDestination();
    no.connect(destino);

    S.ecoNo = no;
    S.ecoOrigem = origem;
    S.ecoDestino = destino;

    const limpo = new MediaStream([
      ...stream.getVideoTracks(),
      destino.stream.getAudioTracks()[0],
    ]);
    // guarda a original para conseguir parar tudo depois
    limpo._origem = stream;
    return limpo;
  } catch (err) {
    console.warn('cancelador de eco indisponivel:', err.message);
    return stream;
  }
}

function desligarCancelador() {
  try { S.ecoOrigem && S.ecoOrigem.disconnect(); } catch {}
  try { S.saidaMix && S.ecoNo && S.saidaMix.disconnect(S.ecoNo); } catch {}
  try { S.ecoNo && S.ecoNo.disconnect(); } catch {}
  S.ecoNo = null; S.ecoOrigem = null; S.ecoDestino = null;
}

async function startShare() {
  if (!pickerSel) return;
  const withAudio = $('shareAudio').checked;
  const modoCinema = $('muteSelf').checked;
  const q = $('shareQuality').value;
  // So limitamos a ALTURA. Fixar largura+altura faz o Chromium recortar quando a
  // proporcao do monitor e diferente (ultrawide, 16:10) - era o "nao pega a tela toda".
  const preset = {
    '720': { h: 720, fps: 30, bitrate: 2_500_000 },
    '1080': { h: 1080, fps: 30, bitrate: 4_000_000 },
    '1080-60': { h: 1080, fps: 60, bitrate: 6_000_000 },
    '1440': { h: 1440, fps: 30, bitrate: 8_000_000 },
    'nativo': { h: 0, fps: 60, bitrate: 12_000_000 },
  }[q] || { h: 1080, fps: 30, bitrate: 4_000_000 };

  $('pickerModal').classList.add('hidden');
  try {
    await API.selectSource({ id: pickerSel, audio: withAudio });
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        ...(preset.h ? { height: { max: preset.h } } : {}),
        frameRate: { ideal: preset.fps, max: preset.fps },
      },
      // sem tratamento de voz: e audio de midia, nao microfone. Com AEC/NS/AGC
      // ligados o Chromium abafa quase tudo (perde ~20 dB).
      audio: withAudio ? {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      } : false,
    });

    // tira as vozes da chamada do audio capturado (senao todo mundo se ouve de volta)
    const limpo = await limparEcoDaTela(stream);

    S.screenStream = limpo;
    S.sharing = true;

    // Modo cinema: zera a saida do app enquanto compartilha. Como as vozes deixam de
    // tocar, elas nao entram no loopback - eco zero. Em troca, voce nao ouve a galera.
    if (modoCinema) {
      saidaAudio().gain.value = 0;
      S.modoCinema = true;
      toast('Modo cinema: voce nao vai ouvir a chamada enquanto compartilha.', 'ok');
    }

    // prioriza fluidez pro video da tela
    for (const p of S.peers.values()) {
      for (const t of limpo.getTracks()) {
        const sender = p.pc.addTrack(t, limpo);
        p.senders.push(sender);
        try {
          const par = sender.getParameters();
          if (!par.encodings || !par.encodings.length) par.encodings = [{}];
          if (t.kind === 'video') {
            par.encodings[0].maxBitrate = preset.bitrate;
            par.encodings[0].maxFramerate = preset.fps;
            par.encodings[0].networkPriority = 'high';
            par.degradationPreference = 'maintain-framerate';
          } else {
            par.encodings[0].maxBitrate = 160_000; // audio de midia merece folga
          }
          sender.setParameters(par);
        } catch {}
      }
    }

    // 'motion' avisa o codificador que e conteudo em movimento: ele prefere manter
    // a taxa de quadros a manter detalhe parado. Faz diferenca grande em jogo.
    for (const p of S.peers.values()) preferirH264(p.pc);

    const faixaVideo = limpo.getVideoTracks()[0];
    faixaVideo.contentHint = 'motion';
    faixaVideo.addEventListener('ended', () => stopShare());

    pushState();
    updateControlUI();
    S.focusKey = 'self:screen';
    renderStage();
    const hasAudio = stream.getAudioTracks().length > 0;
    toast(hasAudio ? 'Compartilhando tela com audio do PC.' : 'Compartilhando tela (sem audio do sistema).', 'ok');
  } catch (err) {
    S.sharing = false;
    updateControlUI();
    if (err && err.name !== 'NotAllowedError') toast('Nao consegui compartilhar: ' + err.message, 'err');
  }
}

function stopShare() {
  if (!S.screenStream) { S.sharing = false; updateControlUI(); return; }
  const stream = S.screenStream;
  for (const p of S.peers.values()) {
    for (const s of [...p.senders]) {
      if (s.track && stream.getTracks().includes(s.track)) {
        try { p.pc.removeTrack(s); } catch {}
        p.senders = p.senders.filter((x) => x !== s);
      }
    }
  }
  desligarCancelador();
  if (S.modoCinema) { saidaAudio().gain.value = 1; S.modoCinema = false; }
  stream.getTracks().forEach((t) => t.stop());
  // o audio cru do Windows fica na stream original, antes do cancelador
  if (stream._origem) stream._origem.getTracks().forEach((t) => t.stop());
  S.screenStream = null;
  S.sharing = false;
  if (S.focusKey === 'self:screen') S.focusKey = null;
  const t = videoTiles.get('self:screen');
  if (t) { t.el.remove(); videoTiles.delete('self:screen'); }
  pushState();
  updateControlUI();
  renderStage();
}

// ---------------------------------------------------------
// Camera
// ---------------------------------------------------------
async function toggleCam() {
  if (S.camOn) return stopCam();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: S.settings.camId ? { exact: S.settings.camId } : undefined,
        width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 },
      },
      audio: false,
    });
    S.camStream = stream;
    S.camOn = true;
    for (const p of S.peers.values()) {
      for (const t of stream.getTracks()) p.senders.push(p.pc.addTrack(t, stream));
    }
    for (const p of S.peers.values()) preferirH264(p.pc);
    stream.getVideoTracks()[0].addEventListener('ended', () => stopCam());
    pushState();
    updateControlUI();
    renderStage();
  } catch (err) {
    toast('Camera indisponivel: ' + err.message, 'err');
  }
}

function stopCam() {
  if (!S.camStream) { S.camOn = false; updateControlUI(); return; }
  const stream = S.camStream;
  for (const p of S.peers.values()) {
    for (const s of [...p.senders]) {
      if (s.track && stream.getTracks().includes(s.track)) {
        try { p.pc.removeTrack(s); } catch {}
        p.senders = p.senders.filter((x) => x !== s);
      }
    }
  }
  stream.getTracks().forEach((t) => t.stop());
  S.camStream = null;
  S.camOn = false;
  if (S.focusKey === 'self:cam') S.focusKey = null;
  const t = videoTiles.get('self:cam');
  if (t) { t.el.remove(); videoTiles.delete('self:cam'); }
  pushState();
  updateControlUI();
  renderStage();
}

// ---------------------------------------------------------
// Dispositivos
// ---------------------------------------------------------
async function fillDevices() {
  let devs = [];
  try { devs = await navigator.mediaDevices.enumerateDevices(); } catch { return; }
  const fill = (sel, kind, saved, labelPadrao) => {
    const node = $(sel);
    node.innerHTML = '';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = labelPadrao;
    node.appendChild(def);
    devs.filter((d) => d.kind === kind).forEach((d, i) => {
      const o = document.createElement('option');
      o.value = d.deviceId;
      o.textContent = d.label || `${labelPadrao} ${i + 1}`;
      node.appendChild(o);
    });
    node.value = saved || '';
  };
  fill('selMic', 'audioinput', S.settings.micId, 'Padrao do sistema');
  fill('selSpk', 'audiooutput', S.settings.spkId, 'Padrao do sistema');
  fill('selCam', 'videoinput', S.settings.camId, 'Padrao do sistema');
}

// ---------------------------------------------------------
// Telas / navegacao
// ---------------------------------------------------------
function showConnect(msg) {
  $('appScreen').classList.add('hidden');
  $('connectScreen').classList.remove('hidden');
  if (msg) setConnectMsg(msg, 'err');
}
function showApp() {
  $('connectScreen').classList.add('hidden');
  $('appScreen').classList.remove('hidden');
  $('serverName').textContent = S.serverName;
  $('selfName').textContent = S.name;
  atualizarMeuAvatar();
  updateControlUI();
  syncViewControls();
  renderStage();
  carregarSons();
}
function setFirewallBox(st) {
  const box = $('fwBox');
  box.classList.remove('hidden');
  box.classList.toggle('ok', !!st.allowed);
  $('fwText').textContent = st.allowed
    ? 'Firewall liberado - seus amigos conseguem chegar ate aqui.'
    : st.blocked
      ? 'Existe uma regra de BLOQUEIO no firewall para o Discordia. Ninguem vai conseguir entrar ate remove-la.'
      : 'O firewall do Windows pode bloquear a entrada dos seus amigos (inclusive pela VPN).';
  $('btnFirewall').classList.toggle('hidden', !!st.allowed);
  $('btnFirewall').textContent = st.blocked ? 'Remover bloqueio e liberar' : 'Liberar no firewall';
}

async function checkFirewall() {
  try {
    const st = await API.firewallStatus();
    if (!st.supported) return;
    setFirewallBox(st);
  } catch { /* opcional */ }
}

function setConnectMsg(text, cls) {
  const n = $('connectMsg');
  n.textContent = text || '';
  n.className = 'connect-msg' + (cls ? ' ' + cls : '');
}

function teardownAll() {
  clearPeers();
  desligarCancelador();
  if (S.screenStream) {
    S.screenStream.getTracks().forEach((t) => t.stop());
    if (S.screenStream._origem) S.screenStream._origem.getTracks().forEach((t) => t.stop());
    S.screenStream = null;
  }
  if (S.camStream) { S.camStream.getTracks().forEach((t) => t.stop()); S.camStream = null; }
  stopMic();
  videoTiles.forEach((t) => t.el.remove());
  videoTiles.clear();
  S.room = null;
  S.sharing = false;
  S.camOn = false;
  S.muted = false;
  S.deafened = false;
  S.rooms = [];
  $('chatLog').innerHTML = '';
}

async function doConnect(url) {
  const name = ($('inpName').value || '').trim();
  if (!name) { setConnectMsg('Escolhe um nome primeiro.', 'err'); $('inpName').focus(); return false; }
  S.name = name;
  saveSettings({ name, server: url });

  setConnectMsg('Conectando...');
  const mic = await startMic();
  if (!mic) setConnectMsg('Sem microfone - voce ainda pode ouvir e ver telas.', 'err');

  try {
    await connect(url, { silent: true });
  } catch (err) {
    setConnectMsg('Nao consegui conectar em ' + url + '. Confere o endereco e se o servidor esta ligado.', 'err');
    return false;
  }
  setConnectMsg('');
  showApp();
  await fillDevices();
  joinRoom('Geral');
  return true;
}

// ---------------------------------------------------------
// Imagens: reduzir antes de enviar (o chat trafega em base64)
// ---------------------------------------------------------
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem invalida')); };
    img.src = url;
  });
}

/** GIF nao pode ser redesenhado (perderia a animacao): vai inteiro se couber. */
async function prepararImagem(file, { max = 1280, qualidade = 0.85, limiteGif = 4 * 1024 * 1024 } = {}) {
  if (file.type === 'image/gif') {
    if (file.size > limiteGif) throw new Error('GIF grande demais (max 4 MB)');
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(new Error('falha ao ler'));
      fr.readAsDataURL(file);
    });
  }
  const img = await fileToImage(file);
  const escala = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * escala));
  c.height = Math.max(1, Math.round(img.height * escala));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/webp', qualidade);
}

// ---------------------------------------------------------
// Menu de contexto (botao direito nas pessoas)
// ---------------------------------------------------------
function closeCtxMenu() {
  const m = $('ctxMenu');
  m.classList.add('hidden');
  m.innerHTML = '';
}

function posicionarMenu(m, x, y) {
  m.classList.remove('hidden');
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(6, Math.min(x, window.innerWidth - r.width - 8)) + 'px';
  m.style.top = Math.max(6, Math.min(y, window.innerHeight - r.height - 8)) + 'px';
}

function openRoomMenu(room, x, y) {
  const m = $('ctxMenu');
  m.innerHTML = '';
  const titulo = el('div', 'ctx-title');
  const nm = document.createElement('span');
  nm.textContent = '# ' + room.name;
  titulo.appendChild(nm);
  m.appendChild(titulo);

  const entrar = el('button', 'ctx-item', ICON.vol + '<span>Entrar na sala</span>');
  entrar.onclick = () => { closeCtxMenu(); joinRoom(room.name); };
  m.appendChild(entrar);

  const vazia = !room.users.length;
  const podeApagar = vazia && room.name !== 'Geral';
  const limpar = el('button', 'ctx-item', '<span>Limpar historico do chat</span>');
  limpar.onclick = () => {
    closeCtxMenu();
    send({ type: 'clear-history', room: room.name });
    toast('Historico de #' + room.name + ' apagado.', 'ok');
  };
  m.appendChild(limpar);

  const apagar = el('button', 'ctx-item',
    '<span>' + (room.name === 'Geral' ? 'A sala Geral nao pode ser apagada'
      : vazia ? 'Excluir sala' : 'Tem gente dentro - nao da para excluir') + '</span>');
  apagar.style.color = podeApagar ? 'var(--danger)' : 'var(--dim)';
  if (podeApagar) {
    apagar.onclick = () => {
      closeCtxMenu();
      send({ type: 'delete-room', room: room.name });
    };
  } else {
    apagar.style.cursor = 'default';
  }
  m.appendChild(apagar);
  posicionarMenu(m, x, y);
}

function openPeerMenu(id, x, y) {
  if (id === S.selfId) return openProfile(id);
  const p = S.peers.get(id);
  if (!p) return;
  const m = $('ctxMenu');
  m.innerHTML = '';

  const titulo = el('div', 'ctx-title');
  titulo.appendChild(avatarEl(p.name, p.id, 'sm'));
  const nm = document.createElement('span');
  nm.textContent = p.name;
  titulo.appendChild(nm);
  m.appendChild(titulo);

  // volume da pessoa
  const bloco = el('div', 'ctx-slider');
  const lbl = el('div', 'lbl');
  const t1 = document.createElement('span'); t1.textContent = 'Volume';
  const t2 = document.createElement('span'); t2.textContent = volumeOf(id) + '%';
  lbl.append(t1, t2);
  const range = document.createElement('input');
  range.type = 'range'; range.min = 0; range.max = 200; range.step = 5;
  range.value = volumeOf(id);
  range.oninput = () => { t2.textContent = range.value + '%'; setVolumeOf(id, Number(range.value)); };
  bloco.append(lbl, range);
  m.appendChild(bloco);

  const mudo = volumeOf(id) === 0;
  const bMudo = el('button', 'ctx-item', (mudo ? ICON.spk : ICON.spkOff) +
    '<span>' + (mudo ? 'Reativar som' : 'Silenciar so pra mim') + '</span>');
  bMudo.onclick = () => { setVolumeOf(id, mudo ? 100 : 0); closeCtxMenu(); renderRooms(); };
  m.appendChild(bMudo);

  const bPerfil = el('button', 'ctx-item', ICON.user + '<span>Ver perfil</span>');
  bPerfil.onclick = () => { closeCtxMenu(); openProfile(id); };
  m.appendChild(bPerfil);

  // telas/cameras dessa pessoa tem volume proprio
  for (const [sid, st] of p.streams) {
    if (!st.getVideoTracks().length || !st.getAudioTracks().length) continue;
    const key = p.id + ':' + sid;
    const b2 = el('div', 'ctx-slider');
    const l2 = el('div', 'lbl');
    const a1 = document.createElement('span');
    a1.textContent = sid === p.screenStreamId ? 'Audio da tela' : 'Audio da camera';
    const a2 = document.createElement('span'); a2.textContent = volumeOf(key) + '%';
    l2.append(a1, a2);
    const r2 = document.createElement('input');
    r2.type = 'range'; r2.min = 0; r2.max = 200; r2.step = 5; r2.value = volumeOf(key);
    r2.oninput = () => { a2.textContent = r2.value + '%'; setVolumeOf(key, Number(r2.value)); };
    b2.append(l2, r2);
    m.appendChild(b2);
  }

  posicionarMenu(m, x, y);
}

// ---------------------------------------------------------
// Perfil (o meu para editar, o dos outros para ver)
// ---------------------------------------------------------
let perfilAberto = null;

function openProfile(id) {
  perfilAberto = id;
  const eu = id === S.selfId;
  const p = eu ? null : S.peers.get(id);
  if (!eu && !p) return;

  const nome = eu ? (S.name || 'Voce') : p.name;
  $('profileTitle').textContent = eu ? 'Seu perfil' : 'Perfil';
  $('profileName').textContent = nome;
  const av = avatarEl(nome, id, 'xl');
  av.id = 'profileAvatar';
  $('profileAvatar').replaceWith(av);

  $('profileEdit').classList.toggle('hidden', !eu);
  $('profileView').classList.toggle('hidden', eu);

  if (eu) {
    $('profileNameInput').value = S.name || '';
    $('profileSub').textContent = S.room ? 'na sala ' + S.room : 'fora de sala';
  } else {
    const partes = [];
    if (p.muted) partes.push('microfone mudo');
    if (p.sharing) partes.push('compartilhando tela');
    if (p.cam) partes.push('camera ligada');
    $('profileSub').textContent = partes.length ? partes.join(' - ') : 'na chamada';
    $('peerVol').value = volumeOf(id);
    $('peerVolVal').textContent = volumeOf(id) + '%';

    const box = $('profileStreams');
    box.innerHTML = '';
    for (const [sid, st] of p.streams) {
      if (!st.getVideoTracks().length || !st.getAudioTracks().length) continue;
      const key = p.id + ':' + sid;
      const campo = el('label', 'field');
      const span = document.createElement('span');
      span.textContent = sid === p.screenStreamId ? 'Volume do audio da tela ' : 'Volume do audio da camera ';
      const b = document.createElement('b');
      b.textContent = volumeOf(key) + '%';
      span.appendChild(b);
      const r = document.createElement('input');
      r.type = 'range'; r.min = 0; r.max = 200; r.step = 5; r.value = volumeOf(key);
      r.oninput = () => { b.textContent = r.value + '%'; setVolumeOf(key, Number(r.value)); };
      campo.append(span, r);
      box.appendChild(campo);
    }
  }
  $('profileModal').classList.remove('hidden');
}

function salvarPerfil() {
  if (perfilAberto === S.selfId) {
    const novo = ($('profileNameInput').value || '').trim();
    if (novo && novo !== S.name) {
      S.name = novo;
      saveSettings({ name: novo });
      $('selfName').textContent = novo;
      send({ type: 'identify', name: S.name, avatar: S.settings.avatar || '' });
      renderStage();
    }
  }
  $('profileModal').classList.add('hidden');
}

async function definirAvatar(file) {
  try {
    const dataUrl = await prepararImagem(file, { max: 160, qualidade: 0.88, limiteGif: 400000 });
    if (dataUrl.length > 380000) return toast('Imagem muito pesada para o perfil.', 'err');
    saveSettings({ avatar: dataUrl });
    send({ type: 'identify', name: S.name, avatar: dataUrl });
    atualizarMeuAvatar();
    openProfile(S.selfId);
  } catch (e) {
    toast('Nao consegui usar essa imagem: ' + e.message, 'err');
  }
}

function atualizarMeuAvatar() {
  const av = avatarEl(S.name, S.selfId, 'sm');
  av.id = 'selfAvatar';
  av.title = 'Editar perfil';
  av.style.cursor = 'pointer';
  av.onclick = () => openProfile(S.selfId);
  $('selfAvatar').replaceWith(av);
  renderRooms();
  renderStage();
}

// ---------------------------------------------------------
// Chat: emojis, imagens, figurinhas e GIFs
// ---------------------------------------------------------
const EMOJIS = {
  'Rostos': ['😀','😁','😂','🤣','😅','😊','😇','🙂','😉','😍','🥰','😘','😗','🤪','😜','🤨','🧐','🤓','😎','🥳','😏','😒','😞','😔','😢','😭','😤','😠','🤬','🤯','😳','🥵','🥶','😱','🤗','🤔','🤫','🤥','😶','😐','😬','🙄','😴','🤤','😷','🤒','🤕','🤢','🤮','🥴','😵','🤠','😈','👿','💀','☠️','👻','👽','🤖','💩'],
  'Gestos': ['👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','🦾','✌️','🤞','🤟','🤘','👌','🤌','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤙','💅','👀','👁️','🧠','🦷'],
  'Coisas': ['🔥','💯','✨','⭐','🌟','💫','💥','💢','💦','💨','🎉','🎊','🎈','🎁','🏆','🥇','🎮','🕹️','🎧','🎵','🎶','📢','🔔','💡','💰','💸','⚡','☄️','🌈','☀️','🌙','⏰','⌛','📌','📎','🔒','🔑','🔧','⚙️','🧨'],
  'Coracoes': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝'],
  'Comida': ['🍕','🍔','🍟','🌭','🍿','🥓','🍗','🍖','🌮','🌯','🥪','🍜','🍝','🍣','🍤','🍰','🎂','🍩','🍪','🍫','🍬','🍺','🍻','🥤','☕','🧉','🍷','🥃'],
  'Bichos': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦅','🦄','🐝','🦋','🐢','🐍','🐙','🦈','🐳','🐬','🦖'],
};

let dockTab = 'emoji';

function toggleDock(tab) {
  const dock = $('dock');
  if (!dock.classList.contains('hidden') && dockTab === tab) {
    dock.classList.add('hidden');
    return;
  }
  dockTab = tab;
  dock.classList.remove('hidden');
  document.querySelectorAll('.dock-tab').forEach((b) => b.classList.toggle('active', b.dataset.dock === tab));
  renderDock();
}

async function renderDock() {
  const body = $('dockBody');
  body.innerHTML = '';

  if (dockTab === 'emoji') {
    for (const [cat, lista] of Object.entries(EMOJIS)) {
      body.appendChild(el('div', 'emoji-cat', cat));
      const g = el('div', 'emoji-grid');
      for (const e of lista) {
        const b = el('button', null, e);
        b.type = 'button';
        b.onclick = () => {
          const inp = $('chatInput');
          inp.value += e;
          inp.focus();
        };
        g.appendChild(b);
      }
      body.appendChild(g);
    }
    return;
  }

  if (dockTab === 'figurinhas') {
    const itens = await API.libList('figurinhas');
    const add = el('button', 'btn ghost small', 'Adicionar figurinhas');
    add.type = 'button';
    add.style.marginBottom = '8px';
    add.onclick = async () => {
      const r = await API.libAdd('figurinhas');
      if (r.ok) renderDock();
    };
    body.appendChild(add);
    if (!itens.length) {
      body.appendChild(el('div', 'dock-empty', 'Nenhuma figurinha ainda.\nAdicione PNG, JPG, WEBP ou GIF do seu PC.'));
      return;
    }
    const g = el('div', 'pick-grid');
    for (const it of itens) {
      const b = el('button', 'pick-item');
      b.type = 'button';
      b.title = it.name;
      const img = document.createElement('img');
      img.src = it.url;
      b.appendChild(img);
      const del = el('span', 'pick-del', '×');
      del.onclick = async (e) => {
        e.stopPropagation();
        await API.libRemove('figurinhas', it.id);
        renderDock();
      };
      b.appendChild(del);
      b.onclick = () => enviarImagem(it.url, 'figurinha');
      g.appendChild(b);
    }
    body.appendChild(g);
    return;
  }

  if (dockTab === 'gif') {
    const chave = (S.settings.giphyKey || '').trim();
    if (!chave) {
      body.appendChild(el('div', 'dock-empty',
        'Busca de GIFs desligada.\nCole uma chave gratuita do Giphy em Configuracoes\n(developers.giphy.com).'));
      return;
    }
    const busca = document.createElement('input');
    busca.type = 'text';
    busca.className = 'dock-search';
    busca.placeholder = 'Buscar GIF... (Enter)';
    body.appendChild(busca);
    const g = el('div', 'pick-grid');
    body.appendChild(g);

    const carregar = async (termo) => {
      g.innerHTML = '<div class="dock-empty">Buscando...</div>';
      try {
        const base = termo
          ? 'https://api.giphy.com/v1/gifs/search?q=' + encodeURIComponent(termo) + '&'
          : 'https://api.giphy.com/v1/gifs/trending?';
        const r = await fetch(base + 'api_key=' + encodeURIComponent(chave) + '&limit=24&rating=pg-13');
        const j = await r.json();
        g.innerHTML = '';
        if (!j.data || !j.data.length) {
          g.innerHTML = '<div class="dock-empty">Nada encontrado.</div>';
          return;
        }
        for (const item of j.data) {
          const prev = item.images && (item.images.fixed_width_small || item.images.fixed_width);
          const cheio = item.images && (item.images.downsized_medium || item.images.original);
          if (!prev || !cheio) continue;
          const b = el('button', 'pick-item');
          b.type = 'button';
          const img = document.createElement('img');
          img.src = prev.url;
          img.loading = 'lazy';
          b.appendChild(img);
          b.onclick = () => enviarImagem(cheio.url, 'gif');
          g.appendChild(b);
        }
      } catch {
        g.innerHTML = '<div class="dock-empty">Falha ao falar com o Giphy.\nConfira a chave e a internet.</div>';
      }
    };
    busca.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); carregar(busca.value.trim()); } };
    carregar('');
  }
}

function enviarImagem(url, kind) {
  if (!S.room) return toast('Entre numa sala para conversar.', 'err');
  const msg = { type: 'chat', text: '', image: url, kind };
  send(msg);
  addChat({ from: S.selfId, name: S.name, text: '', image: url, kind, ts: Date.now() });
  $('dock').classList.add('hidden');
}

async function enviarArquivosImagem(files) {
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    try {
      const dataUrl = await prepararImagem(f);
      enviarImagem(dataUrl, 'imagem');
    } catch (e) {
      toast('Nao consegui enviar ' + f.name + ': ' + e.message, 'err');
    }
  }
}

function abrirLightbox(src) {
  $('lightboxImg').src = src;
  $('lightbox').classList.remove('hidden');
}

// ---------------------------------------------------------
// Soundboard: audios do usuario tocados para a sala
// ---------------------------------------------------------
const board = { itens: [], buffers: new Map() };

function base64ParaBuffer(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

async function carregarSons() {
  board.itens = await API.libList('sons');
  renderBoard();
}

function renderBoard() {
  const g = $('boardGrid');
  g.innerHTML = '';
  if (!board.itens.length) {
    g.appendChild(el('div', 'dock-empty', 'Nenhum efeito ainda.\nAdicione MP3, WAV ou OGG do seu PC.'));
    return;
  }
  board.itens.forEach((it, i) => {
    const b = el('button', 'board-item');
    b.type = 'button';
    b.appendChild(el('span', 'board-key', i < 9 ? String(i + 1) : ''));
    const nm = el('span', 'board-name');
    nm.textContent = it.name;
    b.appendChild(nm);
    const del = el('span', 'board-del', '×');
    del.onclick = async (e) => {
      e.stopPropagation();
      await API.libRemove('sons', it.id);
      board.buffers.delete(it.id);
      carregarSons();
    };
    b.appendChild(del);
    b.onclick = () => tocarSom(it.id);
    g.appendChild(b);
  });
}

async function tocarSom(id) {
  const it = board.itens.find((x) => x.id === id);
  if (!it) return;
  try {
    const ctx = ensureAudioCtx();
    let buf = board.buffers.get(id);
    if (!buf) {
      buf = await ctx.decodeAudioData(base64ParaBuffer(it.url));
      board.buffers.set(id, buf);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = (S.settings.boardVol == null ? 80 : S.settings.boardVol) / 100;
    src.connect(g);
    g.connect(saidaAudio());                    // eu escuto
    if (S.micDest) g.connect(S.micDest);        // a sala escuta (mesmo mutado)
    src.start();
    const btn = [...document.querySelectorAll('.board-item')][board.itens.indexOf(it)];
    if (btn) {
      btn.classList.add('playing');
      src.onended = () => btn.classList.remove('playing');
    }
  } catch (e) {
    toast('Nao consegui tocar esse audio: ' + e.message, 'err');
  }
}

// ---------------------------------------------------------
// Tela cheia
// ---------------------------------------------------------
async function setFullscreen(on) {
  S.fullscreen = !!on;
  document.body.classList.toggle('fullscreen', S.fullscreen);
  $('fsBar').classList.toggle('hidden', !S.fullscreen);
  try { await API.setFullScreen(S.fullscreen); } catch {}
  updateControlUI();
  renderStage();
}

// ---------------------------------------------------------
// Eventos da UI
// ---------------------------------------------------------
function wireUI() {
  // janela
  $('btnMin').onclick = () => API.minimize();
  $('btnMax').onclick = () => API.toggleMaximize();
  $('btnClose').onclick = () => API.close();

  // conexao
  $('btnConnect').onclick = async () => {
    const url = normalizeUrl($('inpServer').value);
    if (!url) { setConnectMsg('Informe o endereco do servidor.', 'err'); return; }
    $('inpServer').value = url;
    $('btnConnect').disabled = true;
    await doConnect(url);
    $('btnConnect').disabled = false;
  };

  $('btnHost').onclick = async () => {
    $('btnHost').disabled = true;
    setConnectMsg('Ligando o servidor...');
    const res = await API.startServer({ port: DEFAULT_PORT });
    if (!res.ok) {
      setConnectMsg(res.error || 'Falha ao iniciar o servidor.', 'err');
      $('btnHost').disabled = false;
      return;
    }
    const box = $('hostInfo');
    const addrs = $('hostAddrs');
    addrs.innerHTML = '';
    const list = [
      ...(res.addresses || []),
      { address: 'localhost', iface: 'este PC', vpn: false },
    ];
    for (const ip of list) {
      const url = `ws://${ip.address}:${res.port}`;
      const row = el('div', 'addr' + (ip.vpn ? ' is-vpn' : ''));
      const meta = el('div', 'meta');
      const sp = document.createElement('span');
      sp.textContent = url;
      meta.appendChild(sp);
      if (ip.vpn) meta.appendChild(el('span', 'tag-vpn', 'VPN'));
      const iface = el('span', 'iface');
      iface.textContent = ip.iface;
      meta.appendChild(iface);
      const cp = el('button', null, 'copiar');
      cp.onclick = () => { navigator.clipboard.writeText(url); toast('Endereco copiado!', 'ok'); };
      row.append(meta, cp);
      addrs.appendChild(row);
    }
    if ((res.addresses || []).some((a) => a.vpn)) {
      setConnectMsg('VPN detectada - use o endereco marcado como VPN.', 'ok');
    }
    box.classList.remove('hidden');
    checkFirewall();
    setConnectMsg('Servidor no ar. Entrando...', 'ok');
    $('inpServer').value = `ws://localhost:${res.port}`;
    await doConnect(`ws://localhost:${res.port}`);
    $('btnHost').disabled = false;
  };

  $('btnFirewall').onclick = async () => {
    const btn = $('btnFirewall');
    btn.disabled = true;
    btn.textContent = 'Aguardando...';
    const st = await API.serverStatus();
    const res = await API.firewallAllow({ port: st.port || DEFAULT_PORT });
    btn.disabled = false;
    btn.textContent = 'Liberar no firewall';
    if (res.ok) {
      await checkFirewall();
      toast('Firewall liberado para o Discordia.', 'ok');
    } else {
      toast(res.error || 'Nao foi possivel liberar o firewall.', 'err');
    }
  };

  $('inpServer').onkeydown = (e) => { if (e.key === 'Enter') $('btnConnect').click(); };
  $('inpName').onkeydown = (e) => { if (e.key === 'Enter') $('btnConnect').click(); };

  // controles da chamada
  $('btnMic').onclick = toggleMute;
  $('btnDeaf').onclick = toggleDeafen;
  $('btnMicMini').onclick = toggleMute;
  $('btnDeafMini').onclick = toggleDeafen;
  $('btnCam').onclick = toggleCam;
  $('btnShare').onclick = openPicker;
  $('btnLeave').onclick = leaveRoom;

  $('btnToggleChat').innerHTML = ICON.chat;
  $('btnToggleChat').onclick = () => $('appScreen').classList.toggle('no-chat');
  $('btnSettings').innerHTML = ICON.gear;
  $('btnSettings').onclick = async () => {
    await fillDevices();
    $('settingsModal').classList.remove('hidden');
  };

  // salas
  $('btnNewRoom').onclick = () => {
    $('roomModal').classList.remove('hidden');
    $('inpRoom').value = '';
    setTimeout(() => $('inpRoom').focus(), 50);
  };
  $('btnCreateRoom').onclick = () => {
    const name = ($('inpRoom').value || '').trim();
    if (!name) return;
    $('roomModal').classList.add('hidden');
    joinRoom(name);
  };
  $('inpRoom').onkeydown = (e) => { if (e.key === 'Enter') $('btnCreateRoom').click(); };

  // chat
  $('chatForm').onsubmit = (e) => {
    e.preventDefault();
    const text = $('chatInput').value.trim();
    if (!text || !S.room) return;
    send({ type: 'chat', text });
    addChat({ from: S.selfId, name: S.name, text, ts: Date.now() });
    $('chatInput').value = '';
  };

  // picker de tela
  document.querySelectorAll('.tab').forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      pickerTab = t.dataset.tab;
      pickerSel = null;
      $('btnStartShare').disabled = true;
      renderPicker();
    };
  });
  $('btnStartShare').onclick = startShare;

  // fechar modais
  document.querySelectorAll('[data-close]').forEach((b) => {
    b.onclick = () => $(b.dataset.close).classList.add('hidden');
  });
  document.querySelectorAll('.modal-back').forEach((m) => {
    m.onclick = (e) => { if (e.target === m) m.classList.add('hidden'); };
  });

  // configuracoes
  $('selMic').onchange = async (e) => {
    saveSettings({ micId: e.target.value });
    if (S.micStream) {
      const old = S.micTrack;
      stopMic();
      await startMic();
      // troca a faixa em todas as conexoes
      for (const p of S.peers.values()) {
        for (const s of p.senders) {
          if (s.track === old || (s.track && s.track.kind === 'audio')) {
            try { await s.replaceTrack(S.micTrack); } catch {}
          }
        }
      }
    }
  };
  $('selSpk').onchange = (e) => {
    saveSettings({ spkId: e.target.value });
    applySink();
  };
  $('selCam').onchange = (e) => saveSettings({ camId: e.target.value });
  $('volIn').oninput = (e) => {
    const v = Number(e.target.value);
    $('volInVal').textContent = v + '%';
    saveSettings({ volIn: v });
    applyMicEnabled();
  };
  $('volOut').oninput = (e) => {
    const v = Number(e.target.value);
    $('volOutVal').textContent = v + '%';
    saveSettings({ volOut: v });
    applyOutputVolume();
  };
  $('optEcho').onchange = (e) => saveSettings({ echo: e.target.checked });
  $('optSounds').onchange = (e) => saveSettings({ sounds: e.target.checked });
  $('optTray').onchange = (e) => saveSettings({ minimizeToTray: e.target.checked });
  $('btnDisconnect').onclick = () => {
    $('settingsModal').classList.add('hidden');
    if (S.ws) { const w = S.ws; S.ws = null; try { w.close(); } catch {} }
    teardownAll();
    setStatus('desconectado', 'off');
    showConnect();
  };

  // ----- layout do palco -----
  const aplicarLayout = (modo) => {
    saveSettings({ layout: modo });
    if (modo === 'grade') S.focusKey = null;
    renderStage();
  };
  document.querySelectorAll('.seg-btn').forEach((b) => {
    b.onclick = () => aplicarLayout(b.dataset.layout);
  });
  const aplicarTamanho = (v) => {
    saveSettings({ tileSize: Number(v) });
    renderStage();
  };
  $('tileSize').oninput = (e) => aplicarTamanho(e.target.value);
  $('fsTileSize').oninput = (e) => aplicarTamanho(e.target.value);

  const alternarVazios = () => {
    saveSettings({ hideEmpty: !S.settings.hideEmpty });
    renderStage();
  };
  $('btnHideEmpty').onclick = alternarVazios;
  $('fsHideEmpty').onclick = alternarVazios;

  $('btnFullscreen').innerHTML = ICON.expand;
  $('btnFullscreen').onclick = () => setFullscreen(!S.fullscreen);
  $('fsExit').onclick = () => setFullscreen(false);
  $('fsMic').onclick = toggleMute;
  $('fsDeaf').onclick = toggleDeafen;
  $('fsShare').onclick = openPicker;

  // ----- perfil -----
  $('selfAvatar').onclick = () => openProfile(S.selfId);
  $('btnProfileSave').onclick = salvarPerfil;
  $('btnPickAvatar').onclick = () => $('fileAvatar').click();
  $('fileAvatar').onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) definirAvatar(f);
  };
  $('btnClearAvatar').onclick = () => {
    saveSettings({ avatar: '' });
    send({ type: 'identify', name: S.name, avatar: '' });
    atualizarMeuAvatar();
    openProfile(S.selfId);
  };
  $('profileNameInput').onkeydown = (e) => { if (e.key === 'Enter') salvarPerfil(); };
  $('peerVol').oninput = (e) => {
    $('peerVolVal').textContent = e.target.value + '%';
    if (perfilAberto) setVolumeOf(perfilAberto, Number(e.target.value));
  };

  // ----- chat: emojis, imagens, figurinhas, GIFs -----
  $('btnEmoji').innerHTML = ICON.smile;
  $('btnEmoji').onclick = () => toggleDock('emoji');
  $('btnSticker').innerHTML = ICON.sticker;
  $('btnSticker').onclick = () => toggleDock('figurinhas');
  $('btnGif').onclick = () => toggleDock('gif');
  $('btnImage').innerHTML = ICON.image;
  $('btnImage').onclick = () => $('fileImage').click();
  $('fileImage').onchange = (e) => {
    const fs_ = [...(e.target.files || [])];
    e.target.value = '';
    enviarArquivosImagem(fs_);
  };
  $('dockClose').onclick = () => $('dock').classList.add('hidden');
  document.querySelectorAll('.dock-tab').forEach((b) => {
    b.onclick = () => toggleDock(b.dataset.dock);
  });

  // colar imagem direto no chat
  $('chatInput').addEventListener('paste', (e) => {
    const itens = [...(e.clipboardData ? e.clipboardData.items : [])];
    const imgs = itens.filter((i) => i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean);
    if (imgs.length) {
      e.preventDefault();
      enviarArquivosImagem(imgs);
    }
  });

  // arrastar e soltar imagem no painel do chat
  const chat = $('chatPanel');
  let dragDepth = 0;
  chat.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (++dragDepth === 1) $('chatDrop').classList.remove('hidden');
  });
  chat.addEventListener('dragover', (e) => e.preventDefault());
  chat.addEventListener('dragleave', () => {
    if (--dragDepth <= 0) { dragDepth = 0; $('chatDrop').classList.add('hidden'); }
  });
  chat.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    $('chatDrop').classList.add('hidden');
    enviarArquivosImagem([...(e.dataTransfer ? e.dataTransfer.files : [])]);
  });
  $('lightbox').onclick = () => $('lightbox').classList.add('hidden');

  // ----- soundboard -----
  $('btnBoard').onclick = async () => {
    await carregarSons();
    $('boardModal').classList.remove('hidden');
  };
  $('btnAddSound').onclick = async () => {
    const r = await API.libAdd('sons');
    if (r.ok) carregarSons();
  };
  $('boardVol').oninput = (e) => {
    $('boardVolVal').textContent = e.target.value + '%';
    saveSettings({ boardVol: Number(e.target.value) });
  };

  // ----- giphy -----
  $('inpGiphy').onchange = (e) => saveSettings({ giphyKey: e.target.value.trim() });

  // ----- menu de contexto -----
  window.addEventListener('click', closeCtxMenu);
  window.addEventListener('blur', closeCtxMenu);
  window.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('[data-speak]')) closeCtxMenu();
  });

  // atalhos
  window.addEventListener('keydown', (e) => {
    const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);

    if (e.ctrlKey && e.shiftKey && e.code === 'KeyM') { e.preventDefault(); toggleMute(); }
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') { e.preventDefault(); toggleDeafen(); }
    if (e.key === 'F11') { e.preventDefault(); setFullscreen(!S.fullscreen); }

    // 1 a 9 disparam os efeitos sonoros (quando nao esta escrevendo)
    if (!digitando && !e.ctrlKey && !e.altKey && /^[1-9]$/.test(e.key) && board.itens.length) {
      const it = board.itens[Number(e.key) - 1];
      if (it) { e.preventDefault(); tocarSom(it.id); }
    }

    if (e.key === 'Escape') {
      closeCtxMenu();
      const abertos = document.querySelectorAll('.modal-back:not(.hidden)');
      if (abertos.length) { abertos.forEach((m) => m.classList.add('hidden')); return; }
      if (!$('dock').classList.contains('hidden')) { $('dock').classList.add('hidden'); return; }
      if (S.fullscreen) { setFullscreen(false); return; }
      if (S.focusKey) { S.focusKey = null; renderStage(); }
    }
  });

  navigator.mediaDevices.addEventListener('devicechange', fillDevices);
}

// ---------------------------------------------------------
// Boot
// ---------------------------------------------------------
(async function boot() {
  wireUI();
  await loadSettings();
  const info = await API.appInfo();
  DEFAULT_PORT = info.defaultPort || DEFAULT_PORT;
  $('appVersion').textContent = `v${info.version} - Electron ${info.electron}`;
  if (!$('inpName').value) $('inpName').value = info.user || '';
  $('inpGiphy').value = S.settings.giphyKey || '';
  $('boardVol').value = S.settings.boardVol == null ? 80 : S.settings.boardVol;
  $('boardVolVal').textContent = $('boardVol').value + '%';
  updateControlUI();
  syncViewControls();
  startLevelLoop();

  // conexao automatica (testes): ?auto=Nome|ws://host:porta
  const auto = new URLSearchParams(location.search).get('auto');
  if (auto) {
    const [nome, url] = auto.split('|');
    $('inpName').value = nome || 'Teste';
    $('inpServer').value = url || 'ws://localhost:45070';
    setTimeout(() => doConnect(normalizeUrl(url)), 400);
  }

  setInterval(() => { if (S.connected) send({ type: 'ping', t: Date.now() }); }, 5000);
})();

window.addEventListener('unhandledrejection', (e) => {
  console.log('REJEICAO: ' + (e.reason && e.reason.stack ? e.reason.stack : e.reason));
});
