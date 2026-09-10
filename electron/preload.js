const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('discordia', {
  // captura de tela
  listSources: () => ipcRenderer.invoke('sources:list'),
  selectSource: (source) => ipcRenderer.invoke('sources:select', source),

  // preferencias
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (data) => ipcRenderer.invoke('settings:set', data),

  // servidor embutido
  startServer: (opts) => ipcRenderer.invoke('server:start', opts || {}),
  stopServer: () => ipcRenderer.invoke('server:stop'),
  serverStatus: () => ipcRenderer.invoke('server:status'),

  // link da internet (tunel) - entrar sem VPN e sem abrir porta no roteador
  tunnelStart: (opts) => ipcRenderer.invoke('tunnel:start', opts || {}),
  tunnelStop: () => ipcRenderer.invoke('tunnel:stop'),
  tunnelStatus: () => ipcRenderer.invoke('tunnel:status'),
  onTunnelDown: (cb) => ipcRenderer.on('tunnel:down', () => cb()),

  // firewall (necessario para hospedar dentro da VPN)
  firewallStatus: () => ipcRenderer.invoke('firewall:status'),
  firewallAllow: (opts) => ipcRenderer.invoke('firewall:allow', opts || {}),

  // biblioteca (figurinhas e sons do usuario)
  libList: (kind) => ipcRenderer.invoke('lib:list', kind),
  libAdd: (kind) => ipcRenderer.invoke('lib:add', kind),
  libRemove: (kind, id) => ipcRenderer.invoke('lib:remove', { kind, id }),

  // area de transferencia
  copiar: (texto) => ipcRenderer.invoke('clipboard:write', texto),

  // app / janela
  appInfo: () => ipcRenderer.invoke('app:info'),
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:maximize'),
  setFullScreen: (on) => ipcRenderer.invoke('window:fullscreen', on),
  close: () => ipcRenderer.send('window:close'),
  quit: () => ipcRenderer.send('app:quit'),
  onWindowState: (cb) => ipcRenderer.on('window:state', (_e, s) => cb(s)),
  errorBox: (title, message) => ipcRenderer.invoke('dialog:error', { title, message }),
});
