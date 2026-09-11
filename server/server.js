/**
 * Discordia - servidor de sinalizacao.
 * WebSocket puro: salas, presenca, chat e troca de SDP/ICE entre os pares.
 * Pode rodar embutido no app (Hospedar) ou sozinho: `node server/server.js`
 */
const http = require('http');
const fsp = require('fs');
const os = require('os');
const crypto = require('crypto');
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

function createServer({ port = DEFAULT_PORT, serverName = 'Servidor Discordia', storeDir = null, senha = null } = {}) {
  const MAX_HISTORICO = 200;   // mensagens guardadas por sala
  const TEMPO_AUTH = 15000;    // tempo para mandar a senha antes de cair
  const MAX_TENTATIVAS = 3;

  /**
   * Na LAN ou dentro de uma VPN, quem alcanca a porta entra - e de proposito.
   * Exposto na internet isso nao serve: com senha configurada, o socket nao ve
   * sala nenhuma nem consegue falar antes de acertar.
   */
  const exigeSenha = !!(senha && String(senha).length);
  const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
  const senhaHash = exigeSenha ? digest(senha) : null;
  // hash dos dois lados: comparacao de tamanho fixo, sem vazar nada pelo tempo
  const senhaConfere = (tentativa) => exigeSenha && crypto.timingSafeEqual(digest(tentativa), senhaHash);
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
      // com senha o servidor esta exposto: nome das salas e de quem esta online
      // nao saem para quem so abriu a URL no navegador
      res.end(JSON.stringify(exigeSenha ? {
        app: 'discordia',
        protegido: true,
        online: clients.size,
      } : {
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

  const STATUS = new Set(['disponivel', 'ocupado', 'ausente']);
  const FAIXAS = new Set(['marca', 'ciano', 'violeta', 'magenta', 'verde', 'ambar', 'rubi', 'grafite']);
  const FONTES = new Set(['padrao', 'orbitron', 'bungee', 'righteous', 'audiowide', 'press', 'monoton', 'pacifico', 'rubik', 'bebas', 'creepster']);
  const EFEITOS = new Set(['solido', 'gradiente', 'neon', 'contorno', 'pop', 'gummy', 'prism']);
  const CORES_NICK = new Set(['branco', 'ciano', 'violeta', 'magenta', 'verde', 'ambar', 'rubi', 'gelo']);
  const MOLDURAS = new Set(['nenhuma', 'anel', 'duplo', 'pulso', 'orbita', 'brilho', 'chama', 'arco', 'cristal']);

  /** Estilo do nick: fonte + efeito + cor, cada um de uma lista fechada. */
  const limparNick = (n) => ({
    fonte: FONTES.has(n && n.fonte) ? n.fonte : 'padrao',
    efeito: EFEITOS.has(n && n.efeito) ? n.efeito : 'solido',
    cor: CORES_NICK.has(n && n.cor) ? n.cor : 'branco',
  });
  const CORES_TAG = new Set(['ciano', 'violeta', 'magenta', 'verde', 'ambar', 'rubi', 'grafite']);
  const MAX_BANNER = 1400000;   // banner com GIF pesa, e ele vai para todo mundo

  /** Etiquetas que a pessoa poe no proprio cartao: no maximo 3, texto curto. */
  const limparTags = (lista) => {
    if (!Array.isArray(lista)) return [];
    return lista.slice(0, 3).map((t) => ({
      texto: String((t && t.texto) || '').slice(0, 18),
      cor: CORES_TAG.has(t && t.cor) ? t.cor : 'ciano',
    })).filter((t) => t.texto.trim());
  };

  const peerInfo = (ws) => ({
    id: ws.id,
    name: ws.name,
    avatar: ws.avatar || null,
    bio: ws.bio || '',
    pronomes: ws.pronomes || '',
    faixa: ws.faixa || 'marca',
    banner: ws.banner || null,
    estiloNick: ws.estiloNick || { fonte: 'padrao', efeito: 'solido', cor: 'branco' },
    moldura: ws.moldura || 'nenhuma',
    corMoldura: ws.corMoldura || 'ciano',
    tags: ws.tags || [],
    status: ws.status || 'disponivel',
    entrouEm: ws.entrouEm || null,
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
      users: [...(rooms.get(name) || [])].map((p) => ({ id: p.id, name: p.name, avatar: p.avatar || null, status: p.status || 'disponivel' })),
    }));

  const broadcastRooms = () => {
    const snap = roomsSnapshot();
    for (const ws of clients.values()) {
      if (ws.autenticado) send(ws, { type: 'rooms', rooms: snap, serverName });
    }
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
    ws.autenticado = !exigeSenha;
    ws.tentativas = 0;
    clients.set(ws.id, ws);

    send(ws, { type: 'hello', id: ws.id, serverName, precisaSenha: exigeSenha });
    if (exigeSenha) {
      // quem fica calado na porta nao ocupa o servidor para sempre
      ws.prazoAuth = setTimeout(() => {
        if (!ws.autenticado) { send(ws, { type: 'auth-fail', motivo: 'tempo' }); ws.close(4001, 'sem senha'); }
      }, TEMPO_AUTH);
    } else {
      broadcastRooms();
    }

    ws.on('pong', () => { ws.alive = true; });

    ws.on('message', (buf) => {
      let msg;
      try { msg = JSON.parse(buf.toString()); } catch { return; }
      if (!msg || typeof msg.type !== 'string') return;

      // antes de acertar a senha o socket so pode fazer uma coisa: tentar a senha
      if (!ws.autenticado) {
        if (msg.type !== 'auth') return;
        if (!senhaConfere(String(msg.senha || ''))) {
          ws.tentativas++;
          send(ws, { type: 'auth-fail', motivo: 'senha' });
          if (ws.tentativas >= MAX_TENTATIVAS) ws.close(4003, 'senha incorreta');
          return;
        }
        ws.autenticado = true;
        clearTimeout(ws.prazoAuth);
        send(ws, { type: 'auth-ok' });
        broadcastRooms();
        return;
      }

      switch (msg.type) {
        case 'identify': {
          ws.name = String(msg.name || 'Usuario').slice(0, 24) || 'Usuario';
          // foto de perfil: data URL pequena (o cliente ja redimensiona para 160px)
          if ('avatar' in msg) {
            const a = String(msg.avatar || '');
            ws.avatar = a.startsWith('data:image/') && a.length <= 400000 ? a : null;
          }
          // cartao de perfil: texto curto e opcoes de uma lista fechada
          if ('bio' in msg) ws.bio = String(msg.bio || '').slice(0, 160);
          if ('pronomes' in msg) ws.pronomes = String(msg.pronomes || '').slice(0, 20);
          if ('faixa' in msg) ws.faixa = FAIXAS.has(msg.faixa) ? msg.faixa : 'marca';
          if ('banner' in msg) {
            const b = String(msg.banner || '');
            ws.banner = b.startsWith('data:image/') && b.length <= MAX_BANNER ? b : null;
          }
          if ('estiloNick' in msg) ws.estiloNick = limparNick(msg.estiloNick);
          if ('moldura' in msg) ws.moldura = MOLDURAS.has(msg.moldura) ? msg.moldura : 'nenhuma';
          if ('corMoldura' in msg) ws.corMoldura = CORES_NICK.has(msg.corMoldura) ? msg.corMoldura : 'ciano';
          if ('tags' in msg) ws.tags = limparTags(msg.tags);
          if ('status' in msg) ws.status = STATUS.has(msg.status) ? msg.status : 'disponivel';
          if (ws.room) broadcast(ws.room, { type: 'peer-state', peer: peerInfo(ws) }, ws.id);
          broadcastRooms();
          break;
        }

        case 'join': {
          const room = String(msg.room || 'Geral').slice(0, 32) || 'Geral';
          if (ws.room === room) break;
          leaveRoom(ws);
          ws.room = room;
          ws.entrouEm = Date.now();
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

        case 'create-room': {
          // criar sem entrar: a sala fica na lista esperando a galera
          const nome = String(msg.room || '').trim().slice(0, 32);
          if (!nome || knownRooms.has(nome)) break;
          knownRooms.add(nome);
          saveRooms();
          broadcastRooms();
          break;
        }

        case 'rename-room': {
          const de = String(msg.room || '');
          const para = String(msg.novo || '').trim().slice(0, 32);
          // a Geral e o porto seguro de quem entra: o nome dela nao muda
          if (de === 'Geral' || !knownRooms.has(de)) break;
          if (!para || para === de || knownRooms.has(para)) break;

          // knownRooms guarda a ordem das salas, entao troca no lugar em vez de re-adicionar
          const ordem = [...knownRooms].map((n) => (n === de ? para : n));
          knownRooms.clear();
          for (const n of ordem) knownRooms.add(n);

          const set = rooms.get(de);
          if (set) {
            rooms.delete(de);
            rooms.set(para, set);
            for (const peer of set) peer.room = para; // quem ja esta dentro vai junto
          }
          if (history.has(de)) {
            history.set(para, history.get(de));
            history.delete(de);
          }
          saveRooms();
          saveHistory();
          broadcast(para, { type: 'room-renamed', de, para });
          broadcastRooms();
          break;
        }

        case 'move-room': {
          const nome = String(msg.room || '');
          if (!knownRooms.has(nome)) break;
          const arr = [...knownRooms];
          const i = arr.indexOf(nome);
          const j = msg.dir === 'up' ? i - 1 : i + 1;
          if (j < 0 || j >= arr.length) break;
          arr.splice(j, 0, arr.splice(i, 1)[0]);
          knownRooms.clear();
          for (const n of arr) knownRooms.add(n);
          saveRooms();
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
      clearTimeout(ws.prazoAuth);
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
  // PORT vem do provedor quando roda hospedado; o resto tem padrao razoavel
  const port = Number(process.argv[2] || process.env.PORT || DEFAULT_PORT);
  const senha = process.env.DISCORDIA_SENHA || null;
  const srv = createServer({
    port,
    senha,
    serverName: process.env.DISCORDIA_NOME || 'Servidor Discordia',
    storeDir: process.env.DISCORDIA_DADOS || require('path').join(process.cwd(), 'dados-discordia'),
  });
  srv.listen().then(({ addresses }) => {
    console.log('== Discordia - servidor de sinalizacao ==');
    console.log('Porta:', port);
    console.log('Senha:', senha ? 'ligada' : 'DESLIGADA (so use assim em LAN ou VPN)');
    console.log('Local:  ws://localhost:' + port);
    for (const ip of addresses) {
      console.log((ip.vpn ? 'VPN:    ' : 'Rede:   ') + 'ws://' + ip.address + ':' + port + '   (' + ip.iface + ')');
    }
  }).catch((e) => {
    console.error('Falha ao iniciar:', e.message);
    process.exit(1);
  });
}
