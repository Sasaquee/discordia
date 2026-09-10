/**
 * Discordia - servidor de sinalizacao.
 * WebSocket puro: salas, presenca, chat e troca de SDP/ICE entre os pares.
 * Pode rodar embutido no app (Hospedar) ou sozinho: `node server/server.js`
 */
const http = require('http');
const fsp = require('fs');
const os = require('os');
const { WebSocketServer } = require('ws');

const DEFAULT_PORT = 45070; // 7070 costuma estar ocupada (AnyDesk)

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Enderecos IPv4 da maquina, com o nome do adaptador.
 * VPNs de LAN (LANVPN, Hamachi, Radmin, ZeroTier...) vem primeiro: e o endereco
 * que os amigos devem usar quando estao todos na mesma VPN.
 */
function localIPs() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      const vpn = /vpn|wireguard|wintun|tap|hamachi|radmin|zerotier|tailscale/i.test(name) ||
        /^(10\.67\.|25\.|26\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(net.address);
      out.push({ address: net.address, iface: name, vpn });
    }
  }
  out.sort((a, b) => (b.vpn ? 1 : 0) - (a.vpn ? 1 : 0));
  return out;
}

function createServer({ port = DEFAULT_PORT, serverName = 'Servidor Discordia', storeDir = null } = {}) {
  const MAX_HISTORICO = 200;   // mensagens guardadas por sala
  const arquivo = (nome) => (storeDir ? require('path').join(storeDir, nome) : null);
  const storePath = arquivo('salas.json');
  const historyPath = arquivo('historico.json');
  /** @type {Map<string, Set<any>>} sala -> sockets conectados nela */
  const rooms = new Map();
  /** Salas continuam existindo mesmo vazias - senao somem quando o ultimo sai. */
  const knownRooms = new Set(['Geral']);

  const loadRooms = () => {
    if (!storePath) return;
    try {
      for (const n of JSON.parse(fsp.readFileSync(storePath, 'utf8'))) {
        if (typeof n === 'string' && n.trim()) knownRooms.add(n.slice(0, 32));
      }
    } catch { /* primeira execucao: arquivo ainda nao existe */ }
  };
  const saveRooms = () => {
    if (!storePath) return;
    try {
      fsp.mkdirSync(storeDir, { recursive: true });
      fsp.writeFileSync(storePath, JSON.stringify([...knownRooms]), 'utf8');
    } catch {}
  };
  loadRooms();

  /**
   * Historico do chat, por sala, guardado na maquina de quem hospeda.
   * Assim a conversa continua la quando todo mundo fecha o app.
   */
  const history = new Map(); // sala -> [mensagens]
  let salvarPendente = null;

  const loadHistory = () => {
    if (!historyPath) return;
    try {
      const dados = JSON.parse(fsp.readFileSync(historyPath, 'utf8'));
      for (const [sala, msgs] of Object.entries(dados)) {
        if (Array.isArray(msgs)) history.set(sala, msgs.slice(-MAX_HISTORICO));
      }
    } catch { /* ainda nao existe */ }
  };
  const saveHistory = () => {
    if (!historyPath || salvarPendente) return;
    // grava no maximo a cada 2s: imagens em base64 deixam o arquivo grande
    salvarPendente = setTimeout(() => {
      salvarPendente = null;
      try {
        fsp.mkdirSync(storeDir, { recursive: true });
        fsp.writeFileSync(historyPath, JSON.stringify(Object.fromEntries(history)), 'utf8');
      } catch {}
    }, 2000);
  };
  const pushHistory = (sala, msg) => {
    const lista = history.get(sala) || [];
    lista.push(msg);
    // mantem o arquivo em tamanho razoavel: imagens antigas viram so o texto
    if (lista.length > MAX_HISTORICO) lista.splice(0, lista.length - MAX_HISTORICO);
    let bytes = 0;
    for (let i = lista.length - 1; i >= 0; i--) {
      bytes += (lista[i].image ? lista[i].image.length : 0) + 200;
      if (bytes > 12 * 1024 * 1024 && lista[i].image) {
        lista[i] = { ...lista[i], image: null, kind: null, text: lista[i].text || '[imagem antiga removida]' };
      }
    }
    history.set(sala, lista);
    saveHistory();
  };
  loadHistory();

  const clients = new Map(); // id -> ws

  const http_ = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        app: 'discordia',
        serverName,
        online: clients.size,
        rooms: [...rooms.entries()].map(([name, set]) => ({ name, users: set.size })),
      }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ server: http_, maxPayload: 8 * 1024 * 1024 });
  // o ws repassa os erros do servidor HTTP (ex.: EADDRINUSE). Sem este handler o
  // evento 'error' fica sem dono e derruba o processo antes do listen() rejeitar.
  wss.on('error', () => {});

  const send = (ws, msg) => {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
  };

  const peerInfo = (ws) => ({
    id: ws.id,
    name: ws.name,
    avatar: ws.avatar || null,
    muted: !!ws.muted,
    deafened: !!ws.deafened,
    sharing: !!ws.sharing,
    screenStreamId: ws.screenStreamId || null,
    camStreamId: ws.camStreamId || null,
    cam: !!ws.cam,
  });

  const roomPeers = (room) => [...(rooms.get(room) || [])];

  const broadcast = (room, msg, exceptId) => {
    for (const peer of roomPeers(room)) {
      if (peer.id !== exceptId) send(peer, msg);
    }
  };

  const roomsSnapshot = () =>
    [...knownRooms].map((name) => ({
      name,
      users: [...(rooms.get(name) || [])].map((p) => ({ id: p.id, name: p.name, avatar: p.avatar || null })),
    }));

  const broadcastRooms = () => {
    const snap = roomsSnapshot();
    for (const ws of clients.values()) send(ws, { type: 'rooms', rooms: snap, serverName });
  };

  const leaveRoom = (ws) => {
    if (!ws.room) return;
    const set = rooms.get(ws.room);
    if (set) {
      set.delete(ws);
      if (!set.size) rooms.delete(ws.room);
    }
    broadcast(ws.room, { type: 'peer-leave', id: ws.id }, ws.id);
    ws.room = null;
    ws.sharing = false;
    ws.screenStreamId = null;
    broadcastRooms();
  };

  wss.on('connection', (ws) => {
    ws.id = makeId();
    ws.name = 'Usuario';
    ws.room = null;
    ws.alive = true;
    clients.set(ws.id, ws);

    send(ws, { type: 'hello', id: ws.id, serverName });
    broadcastRooms();

    ws.on('pong', () => { ws.alive = true; });

    ws.on('message', (buf) => {
      let msg;
      try { msg = JSON.parse(buf.toString()); } catch { return; }
      if (!msg || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'identify': {
          ws.name = String(msg.name || 'Usuario').slice(0, 24) || 'Usuario';
          // foto de perfil: data URL pequena (o cliente ja redimensiona para 160px)
          if ('avatar' in msg) {
            const a = String(msg.avatar || '');
            ws.avatar = a.startsWith('data:image/') && a.length <= 400000 ? a : null;
          }
          if (ws.room) broadcast(ws.room, { type: 'peer-state', peer: peerInfo(ws) }, ws.id);
          broadcastRooms();
          break;
        }

        case 'join': {
          const room = String(msg.room || 'Geral').slice(0, 32) || 'Geral';
          if (ws.room === room) break;
          leaveRoom(ws);
          ws.room = room;
          ws.muted = !!msg.muted;
          ws.deafened = !!msg.deafened;
          if (!knownRooms.has(room)) { knownRooms.add(room); saveRooms(); }
          if (!rooms.has(room)) rooms.set(room, new Set());
          const set = rooms.get(room);
          const existing = [...set].map(peerInfo);
          set.add(ws);
          // quem entra recebe a lista e inicia as conexoes (polite = false p/ quem chega)
          send(ws, { type: 'joined', room, peers: existing, self: peerInfo(ws) });
          send(ws, { type: 'history', room, mensagens: history.get(room) || [] });
          broadcast(room, { type: 'peer-join', peer: peerInfo(ws) }, ws.id);
          broadcastRooms();
          break;
        }

        case 'leave': {
          const room = ws.room;
          leaveRoom(ws);
          send(ws, { type: 'left', room });
          break;
        }

        case 'state': {
          if (typeof msg.muted === 'boolean') ws.muted = msg.muted;
          if (typeof msg.deafened === 'boolean') ws.deafened = msg.deafened;
          if (typeof msg.sharing === 'boolean') ws.sharing = msg.sharing;
          if (typeof msg.cam === 'boolean') ws.cam = msg.cam;
          if ('screenStreamId' in msg) ws.screenStreamId = msg.screenStreamId || null;
          if ('camStreamId' in msg) ws.camStreamId = msg.camStreamId || null;
          if (ws.room) broadcast(ws.room, { type: 'peer-state', peer: peerInfo(ws) }, ws.id);
          break;
        }

        case 'signal': {
          const target = clients.get(msg.to);
          if (target && target.room && target.room === ws.room) {
            send(target, { type: 'signal', from: ws.id, data: msg.data });
          }
          break;
        }

        case 'chat': {
          if (!ws.room) break;
          const text = String(msg.text || '').slice(0, 2000);
          // anexo de imagem (foto, figurinha ou GIF)
          let image = null;
          const img = String(msg.image || '');
          if (img.startsWith('data:image/') && img.length <= 6 * 1024 * 1024) image = img;
          else if (/^https:\/\/[a-z0-9.-]*giphy\.com\//i.test(img)) image = img;
          if (!text.trim() && !image) break;
          const payload = {
            type: 'chat',
            id: makeId(),
            from: ws.id,
            name: ws.name,
            avatar: ws.avatar || null,
            text,
            image,
            kind: image ? String(msg.kind || 'imagem').slice(0, 12) : null,
            ts: Date.now(),
          };
          broadcast(ws.room, payload, ws.id);
          pushHistory(ws.room, payload);
          break;
        }

        case 'delete-room': {
          const nome = String(msg.room || '');
          // so apaga sala vazia, e a Geral nunca some
          if (nome === 'Geral' || !knownRooms.has(nome)) break;
          const set = rooms.get(nome);
          if (set && set.size) break;
          knownRooms.delete(nome);
          rooms.delete(nome);
          history.delete(nome);
          saveRooms();
          saveHistory();
          broadcastRooms();
          break;
        }

        case 'clear-history': {
          const nome = String(msg.room || '');
          if (!knownRooms.has(nome)) break;
          history.delete(nome);
          saveHistory();
          broadcast(nome, { type: 'history', room: nome, mensagens: [] });
          send(ws, { type: 'history', room: nome, mensagens: [] });
          break;
        }

        case 'ping':
          send(ws, { type: 'pong', t: msg.t });
          break;
      }
    });

    ws.on('close', () => {
      leaveRoom(ws);
      clients.delete(ws.id);
      broadcastRooms();
    });
    ws.on('error', () => {});
  });

  const heartbeat = setInterval(() => {
    for (const ws of clients.values()) {
      if (!ws.alive) { try { ws.terminate(); } catch {} continue; }
      ws.alive = false;
      try { ws.ping(); } catch {}
    }
  }, 20000);

  return {
    listen() {
      return new Promise((resolve, reject) => {
        http_.once('error', reject);
        http_.listen(port, '0.0.0.0', () => {
          resolve({ port, addresses: localIPs() });
        });
      });
    },
    close() {
      clearInterval(heartbeat);
      for (const ws of clients.values()) { try { ws.close(); } catch {} }
      return new Promise((r) => http_.close(() => r()));
    },
    get stats() {
      return { online: clients.size, rooms: roomsSnapshot() };
    },
  };
}

module.exports = { createServer, DEFAULT_PORT, localIPs };

if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || DEFAULT_PORT);
  const srv = createServer({ port, storeDir: require('path').join(process.cwd(), 'dados-discordia') });
  srv.listen().then(({ addresses }) => {
    console.log('== Discordia - servidor de sinalizacao ==');
    console.log('Porta:', port);
    console.log('Local:  ws://localhost:' + port);
    for (const ip of addresses) {
      console.log((ip.vpn ? 'VPN:    ' : 'Rede:   ') + 'ws://' + ip.address + ':' + port + '   (' + ip.iface + ')');
    }
  }).catch((e) => {
    console.error('Falha ao iniciar:', e.message);
    process.exit(1);
  });
}
