const { app, BrowserWindow, ipcMain, desktopCapturer, session, shell, Menu, Tray, nativeImage, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { createServer, DEFAULT_PORT, localIPs } = require('../server/server');

/**
 * Ajustes de WebRTC para funcionar dentro de VPN de LAN (LANVPN/WireGuard, Hamachi,
 * Radmin, ZeroTier...):
 *
 * 1) WebRtcHideLocalIpsWithMdns: por padrao o Chromium esconde o IP local atras de um
 *    nome mDNS ("xxx.local"). O outro lado precisa resolver esse nome por multicast,
 *    que nao atravessa o tunel da VPN -> os candidatos morrem e a chamada nao conecta.
 * 2) webrtc-ip-handling-policy=default: usa TODAS as interfaces, inclusive a virtual
 *    da VPN, e nao so a rota padrao.
 */
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns');
app.commandLine.appendSwitch('webrtc-ip-handling-policy', 'default');

// ---- instancia unica (DISCORDIA_MULTI=1 abre varias, util p/ testar sozinho) ----
const ALLOW_MULTI = !!process.env.DISCORDIA_MULTI;
if (!ALLOW_MULTI && !app.requestSingleInstanceLock()) app.quit();
if (ALLOW_MULTI) app.setPath('userData', require('path').join(require('os').tmpdir(), 'discordia-' + process.pid));

let mainWindow = null;
let tray = null;
let embeddedServer = null;
let pendingSource = null; // fonte escolhida pelo usuario p/ getDisplayMedia
let quitting = false;

const SETTINGS_FILE = () => path.join(app.getPath('userData'), 'settings.json');

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE(), 'utf8'));
  } catch {
    return {};
  }
}
function writeSettings(data) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE()), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 940,
    minHeight: 600,
    show: false,
    // 'hidden' (e nao frame:false) mantem a moldura nativa gerenciando a janela:
    // com frame:false o Windows deixa a janela maximizada maior que a area util
    // e o conteudo vaza para fora do monitor.
    titleBarStyle: 'hidden',
    backgroundColor: '#0d0e13',
    icon: path.join(__dirname, '..', 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  const auto = process.env.DISCORDIA_AUTO; // "Nome|ws://host:porta" -> conecta sozinho (testes)
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'),
    auto ? { search: '?auto=' + encodeURIComponent(auto) } : undefined);

  if (process.env.DISCORDIA_DEBUG) {
    mainWindow.webContents.on('console-message', (e) => console.log('[renderer]', e.message, e.sourceId ? e.sourceId.split('/').pop() + ':' + e.lineNumber : ''));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Harness de testes - so em desenvolvimento (nunca no app instalado).
  // Ver CONTEXTO.md > "Como testar".
  if (!app.isPackaged && (process.env.DISCORDIA_EVAL || process.env.DISCORDIA_SHOT)) {
    setTimeout(async () => {
      try {
        if (process.env.DISCORDIA_EVAL) {
          const r = await mainWindow.webContents.executeJavaScript(process.env.DISCORDIA_EVAL);
          console.log('[eval]', JSON.stringify(r));
        }
      } catch (e) { console.log('[eval-erro]', e.message); }
      if (process.env.DISCORDIA_SHOT) {
        setTimeout(async () => {
          fs.writeFileSync(process.env.DISCORDIA_SHOT, (await mainWindow.capturePage()).toPNG());
          console.log('[shot] ok');
        }, Number(process.env.DISCORDIA_SHOT_DELAY || 3000));
      }
    }, Number(process.env.DISCORDIA_DELAY || 6000));
  }


  // Em alguns PCs a janela maximizada fica maior que a area util e a barra de
  // tarefas cobre a parte de baixo do app. Aqui encaixamos na area util do monitor.
  const encaixarNaAreaUtil = () => {
    if (!mainWindow || mainWindow.isFullScreen()) return;
    const b = mainWindow.getBounds();
    const area = screen.getDisplayMatching(b).workArea;
    if (b.width > area.width || b.height > area.height || b.x < area.x || b.y < area.y) {
      mainWindow.setBounds(area);
    }
  };

  mainWindow.on('maximize', () => {
    setTimeout(encaixarNaAreaUtil, 0);
    mainWindow.webContents.send('window:state', { maximized: true });
  });
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:state', { maximized: false }));

  mainWindow.on('close', (e) => {
    if (!quitting && readSettings().minimizeToTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // links externos abrem no navegador
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  try {
    const img = nativeImage
      .createFromPath(path.join(__dirname, '..', 'assets', 'logo.png'))
      .resize({ width: 20, height: 20 });
    tray = new Tray(img);
    tray.setToolTip('Discordia');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Abrir Discordia', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { type: 'separator' },
      { label: 'Sair', click: () => { quitting = true; app.quit(); } },
    ]));
    tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
  } catch { /* tray e opcional */ }
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  // Permissoes de midia liberadas (app local, sem conteudo remoto)
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    const ok = ['media', 'display-capture', 'audioCapture', 'videoCapture', 'notifications', 'clipboard-read'];
    callback(ok.includes(permission));
  });

  /**
   * Captura de tela COM audio do sistema.
   * O renderer escolhe a fonte antes (picker proprio) e guarda em `pendingSource`.
   * `audio: 'loopback'` captura o som do proprio Windows (jogo, video, musica).
   */
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      let chosen = null;
      if (pendingSource) chosen = sources.find((s) => s.id === pendingSource.id) || null;
      if (!chosen) chosen = sources.find((s) => s.id.startsWith('screen')) || sources[0];
      if (!chosen) return callback({});
      const wantAudio = !pendingSource || pendingSource.audio !== false;
      callback({ video: chosen, audio: wantAudio ? 'loopback' : undefined });
    } catch (err) {
      callback({});
    } finally {
      pendingSource = null;
    }
  }, { useSystemPicker: false });

  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---------------- IPC ----------------

ipcMain.handle('sources:list', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 360, height: 220 },
    fetchWindowIcons: true,
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.id.startsWith('screen') ? 'screen' : 'window',
    thumbnail: s.thumbnail && !s.thumbnail.isEmpty() ? s.thumbnail.toDataURL() : null,
    appIcon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : null,
  }));
});

ipcMain.handle('sources:select', (_e, source) => {
  pendingSource = source || null;
  return true;
});

ipcMain.handle('settings:get', () => readSettings());
ipcMain.handle('settings:set', (_e, data) => {
  const merged = { ...readSettings(), ...(data || {}) };
  writeSettings(merged);
  return merged;
});

ipcMain.handle('server:start', async (_e, { port } = {}) => {
  if (embeddedServer) return { ok: true, ...embeddedServer.info };
  const first = Number(port) || DEFAULT_PORT;
  let lastErr = null;
  // se a porta estiver ocupada (AnyDesk, outro app...), tenta as proximas
  for (let p = first; p < first + 5; p++) {
    const srv = createServer({
      port: p,
      serverName: 'Servidor de ' + (process.env.USERNAME || 'Host'),
      storeDir: app.getPath('userData'), // salas e historico do chat continuam apos fechar
    });
    try {
      const info = await srv.listen();
      embeddedServer = srv;
      embeddedServer.info = info;
      return { ok: true, ...info };
    } catch (err) {
      lastErr = err;
      try { await srv.close(); } catch {}
      if (err.code !== 'EADDRINUSE') break;
    }
  }
  return { ok: false, error: lastErr && lastErr.code === 'EADDRINUSE'
    ? 'Nenhuma porta livre entre ' + first + ' e ' + (first + 4) + '.'
    : (lastErr ? lastErr.message : 'Falha desconhecida.') };
});

ipcMain.handle('server:stop', async () => {
  if (embeddedServer) {
    await embeddedServer.close();
    embeddedServer = null;
  }
  return { ok: true };
});

ipcMain.handle('server:status', () => {
  if (!embeddedServer) return { running: false, ips: localIPs(), defaultPort: DEFAULT_PORT };
  return { running: true, ...embeddedServer.info, stats: embeddedServer.stats };
});

// ---- firewall do Windows (necessario para hospedar dentro da VPN) ----
const FW_RULE = 'Discordia';

function ps(command) {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command],
      { windowsHide: true }, (err, stdout) => resolve({ ok: !err, out: (stdout || '').trim() }));
  });
}

/**
 * Uma regra de bloqueio vence qualquer permissao no firewall do Windows - e o
 * Windows cria uma automaticamente quando alguem clica "Cancelar" no aviso de rede.
 * Por isso a checagem exige permissao e ausencia de bloqueio.
 */
const FW_QUERY = `
$r = Get-NetFirewallRule -DisplayName '${FW_RULE}*' -Direction Inbound -Enabled True -ErrorAction SilentlyContinue
$block = @($r | Where-Object { $_.Action -eq 'Block' }).Count
$allow = @($r | Where-Object { $_.Action -eq 'Allow' }).Count
if ($block -gt 0) { 'bloqueado' } elseif ($allow -gt 0) { 'sim' } else { 'nao' }`;

ipcMain.handle('firewall:status', async () => {
  if (process.platform !== 'win32') return { supported: false, allowed: true };
  const r = await ps(FW_QUERY);
  return { supported: true, allowed: r.out === 'sim', blocked: r.out === 'bloqueado' };
});

/** Cria as regras de entrada. Abre o UAC: quem decide e o usuario. */
ipcMain.handle('firewall:allow', async (_e, { port } = {}) => {
  if (process.platform !== 'win32') return { ok: false, error: 'Somente no Windows.' };
  const p = Number(port) || DEFAULT_PORT;
  const exe = process.execPath.replace(/'/g, "''");
  const inner = [
    // tira bloqueios antigos: no Windows, Block sempre vence Allow
    `Get-NetFirewallRule -DisplayName '${FW_RULE}*' -ErrorAction SilentlyContinue | Where-Object { $_.Action -eq 'Block' } | Remove-NetFirewallRule -ErrorAction SilentlyContinue`,
    `New-NetFirewallRule -DisplayName '${FW_RULE}' -Direction Inbound -Action Allow -Program '${exe}' -Profile Any -ErrorAction SilentlyContinue`,
    `New-NetFirewallRule -DisplayName '${FW_RULE} (porta ${p})' -Direction Inbound -Action Allow -Protocol TCP -LocalPort ${p} -Profile Any -ErrorAction SilentlyContinue`,
  ].join('; ');
  const encoded = Buffer.from(inner, 'utf16le').toString('base64');
  const r = await ps(`Start-Process powershell -Verb RunAs -WindowStyle Hidden -Wait -ArgumentList '-NoProfile','-EncodedCommand','${encoded}'`);
  if (!r.ok) return { ok: false, error: 'Permissao de administrador negada.' };
  const check = await ps(FW_QUERY);
  return { ok: check.out === 'sim' };
});

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  platform: process.platform,
  user: process.env.USERNAME || '',
  ips: localIPs(),
  defaultPort: DEFAULT_PORT,
}));

// ---- biblioteca do usuario: figurinhas e sons personalizados ----
const LIB_DIRS = {
  figurinhas: () => path.join(app.getPath('userData'), 'figurinhas'),
  sons: () => path.join(app.getPath('userData'), 'sons'),
};
const LIB_FILTERS = {
  figurinhas: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
  sons: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'webm', 'flac'] }],
};
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4', '.webm': 'audio/webm', '.flac': 'audio/flac',
};

function libList(kind) {
  const dir = LIB_DIRS[kind] && LIB_DIRS[kind]();
  if (!dir) return [];
  try {
    fs.mkdirSync(dir, { recursive: true });
    return fs.readdirSync(dir)
      .filter((f) => MIME[path.extname(f).toLowerCase()])
      .map((f) => {
        const full = path.join(dir, f);
        return {
          id: f,
          name: path.basename(f, path.extname(f)),
          // data URL: o renderer roda com CSP 'self', entao nao carrega file:// solto
          url: 'data:' + MIME[path.extname(f).toLowerCase()] + ';base64,' + fs.readFileSync(full).toString('base64'),
          size: fs.statSync(full).size,
        };
      });
  } catch { return []; }
}

ipcMain.handle('lib:list', (_e, kind) => libList(kind));

ipcMain.handle('lib:add', async (_e, kind) => {
  if (!LIB_DIRS[kind]) return { ok: false };
  const res = await dialog.showOpenDialog(mainWindow, {
    title: kind === 'sons' ? 'Escolha os audios' : 'Escolha as imagens',
    properties: ['openFile', 'multiSelections'],
    filters: LIB_FILTERS[kind],
  });
  if (res.canceled) return { ok: false, canceled: true };
  const dir = LIB_DIRS[kind]();
  fs.mkdirSync(dir, { recursive: true });
  for (const src of res.filePaths) {
    try {
      const stat = fs.statSync(src);
      if (stat.size > 8 * 1024 * 1024) continue; // 8 MB por arquivo
      let dest = path.join(dir, path.basename(src));
      let n = 1;
      while (fs.existsSync(dest)) {
        const ext = path.extname(src);
        dest = path.join(dir, path.basename(src, ext) + '-' + n++ + ext);
      }
      fs.copyFileSync(src, dest);
    } catch { /* ignora arquivo problematico */ }
  }
  return { ok: true, items: libList(kind) };
});

ipcMain.handle('lib:remove', (_e, { kind, id } = {}) => {
  if (!LIB_DIRS[kind] || !id) return { ok: false };
  try {
    // impede sair da pasta da biblioteca
    const dir = LIB_DIRS[kind]();
    const full = path.join(dir, path.basename(id));
    if (path.dirname(full) === dir && fs.existsSync(full)) fs.unlinkSync(full);
    return { ok: true, items: libList(kind) };
  } catch { return { ok: false }; }
});

ipcMain.handle('window:fullscreen', (_e, on) => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(typeof on === 'boolean' ? on : !mainWindow.isFullScreen());
  return mainWindow.isFullScreen();
});

ipcMain.on('window:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow && mainWindow.close());
ipcMain.on('app:quit', () => { quitting = true; app.quit(); });

ipcMain.handle('dialog:error', (_e, { title, message }) => {
  dialog.showErrorBox(title || 'Discordia', message || '');
});
