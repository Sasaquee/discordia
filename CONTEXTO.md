# Contexto do projeto

Documento para retomar o desenvolvimento em outra máquina (ou por outra pessoa) sem
precisar reconstruir o raciocínio. O `README.md` explica como **usar**; este aqui
explica como o app **funciona por dentro** e por que cada decisão foi tomada.

## O que é

App de desktop (Windows) para conversar por voz, vídeo e compartilhar tela **com o som
do PC** — estilo Discord, porém sem nuvem, sem conta e sem servidor de terceiros. Quem
hospeda roda o servidor de sinalização dentro do próprio app.

## Como rodar

```bash
npm install
npm start          # abre o app
npm run server     # só o servidor de sinalização (porta 45070)
npm run icon       # regenera ícones a partir das artes em assets/
npm run dist       # gera dist/Discordia-Setup-<versão>.exe
```

## Arquitetura em uma página

```
┌──────────────┐   WebSocket (SDP/ICE, chat, presença)   ┌──────────────┐
│   Cliente A  │ ◄──────────────────────────────────────► │   Servidor   │
│  (Electron)  │                                          │ (server.js)  │
└──────┬───────┘                                          └──────────────┘
       │              WebRTC P2P: voz, vídeo, tela+áudio          ▲
       │  ◄──────────────────────────────────────────────►        │
┌──────┴───────┐                                                  │
│   Cliente B  │ ◄────────────────────────────────────────────────┘
└──────────────┘
```

- **Áudio e vídeo nunca passam pelo servidor** — é malha P2P (cada um conecta com cada
  um). Ideal até ~6 pessoas; acima disso a banda de subida de quem compartilha pesa.
- O servidor só apresenta os participantes, repassa SDP/ICE e guarda chat/salas.

### Arquivos

| Arquivo | Papel |
|---|---|
| `electron/main.js` | Processo principal: janela, captura de tela com áudio, IPC, servidor embutido, firewall, biblioteca de figurinhas/sons |
| `electron/preload.js` | Ponte segura renderer ↔ main (`contextIsolation` ligado, sem Node no renderer) |
| `renderer/index.html` | Toda a interface (uma tela só, com modais) |
| `renderer/styles.css` | Tema: variáveis CSS no `:root` |
| `renderer/app.js` | Lógica do cliente: WebRTC, áudio, palco, chat, soundboard, perfis |
| `server/server.js` | Sinalização WebSocket + salas + histórico do chat |
| `scripts/make-icon.js` | Gera `build/icon.png/.ico` e `assets/wordmark.png` a partir das artes |

## Decisões que não são óbvias

Cada uma destas resolveu um bug real. Mexer nelas sem entender quebra o app.

**1. Áudio da tela sem processamento de voz.**
`getDisplayMedia` com `audio: { echoCancellation: false, noiseSuppression: false,
autoGainControl: false }`. Com o padrão ligado, o Chromium trata o som do sistema como
microfone e derruba ~21 dB — na prática o pessoal não ouve nada. Medido: 0.016 → 0.174 RMS.

**2. `audio: 'loopback'` no `setDisplayMediaRequestHandler`** (main.js) é o que captura o
som do Windows. O seletor de tela é nosso (`sources:list` + `sources:select`), por isso
`useSystemPicker: false`.

**3. Opus em estéreo via SDP (`tuneOpus`).** Opus negocia mono ~32 kbps por padrão, o que
estraga música e jogo. Injetamos `stereo=1;sprop-stereo=1;maxaveragebitrate=160000`.
Como o offer passa a ser montado à mão, a renegociação só pode acontecer com a conexão
em `stable` — daí o `renegociarDepois`.

**4. Captura sem cortar a tela.** Só limitamos **altura** (`height: { max }`). Fixar
largura+altura juntas faz o Chromium recortar quando a proporção do monitor é diferente
(ultrawide, 16:10).

**5. Mudo por ganho, não por `track.enabled`.** O microfone passa por
`origem → micGain → micDest`. Mutar zera o ganho e mantém a faixa viva, o que permite a
soundboard tocar para a sala mesmo com o microfone fechado (como no Discord).

**6. Áudio remoto pelo WebAudio.** Cada fonte (microfone de fulano, áudio da tela de
beltrano) tem seu `GainNode`, o que dá volume individual e permite passar de 100% —
`<audio>`/`<video>` param em 1.0. O `<audio>` mudo que fica no DOM existe de propósito:
sem um elemento de mídia consumindo a stream, o Chromium não alimenta o WebAudio com
áudio vindo do WebRTC.

**7. `titleBarStyle: 'hidden'` em vez de `frame: false`.** Com `frame: false` o Windows
deixa a janela maximizada maior que a área útil e o conteúdo vaza para fora do monitor.

**8. Ajustes de WebRTC para VPN** (topo do `main.js`): desligar
`WebRtcHideLocalIpsWithMdns` e usar `webrtc-ip-handling-policy=default`. Sem isso, dentro
de uma VPN de LAN o chat conecta mas voz e tela não passam — os candidatos ICE saem
mascarados como `xxx.local` e o mDNS não atravessa o túnel.

**9. Porta padrão 45070.** A 7070 costuma estar ocupada (AnyDesk usa). Se a porta estiver
em uso, o app tenta as 4 seguintes.

**10. `wss.on('error')` no servidor.** O `ws` repassa erros do servidor HTTP; sem esse
handler um `EADDRINUSE` derruba o processo antes do `listen()` rejeitar.

## Onde ficam os dados

Tudo em `%APPDATA%/Discordia/` (`app.getPath('userData')`):

- `settings.json` — nome, avatar, dispositivos, volumes por pessoa, layout
- `salas.json` — salas criadas (continuam existindo mesmo vazias)
- `historico.json` — chat por sala, últimas 200 mensagens, gravado por quem hospeda
- `figurinhas/`, `sons/` — arquivos que o usuário adicionou

## Protocolo (WebSocket, JSON)

Cliente → servidor: `identify`, `join`, `leave`, `state`, `signal`, `chat`,
`delete-room`, `clear-history`, `ping`.
Servidor → cliente: `hello`, `rooms`, `joined`, `history`, `left`, `peer-join`,
`peer-leave`, `peer-state`, `signal`, `chat`, `pong`.

Streams são identificadas por id: `state` anuncia `screenStreamId`/`camStreamId`, e é
assim que o outro lado sabe se a stream que chegou é microfone, tela ou câmera.

## Como testar

Não há suíte automatizada; os testes foram feitos com duas instâncias reais medindo
áudio de verdade. Variáveis de ambiente (só em desenvolvimento, nunca no app instalado):

```bash
DISCORDIA_MULTI=1     # permite abrir várias instâncias (userData separado por PID)
DISCORDIA_DEBUG=1     # joga o console do renderer no terminal
DISCORDIA_AUTO="Ana|ws://localhost:45070"   # conecta sozinho
DISCORDIA_EVAL="<js>" # executa JS no renderer e imprime o retorno
DISCORDIA_SHOT=/caminho.png                  # tira print da janela
```

Exemplo — medir se o áudio da tela chega no outro lado: um cliente toca um tom com
`OscillatorNode`, compartilha a tela, e o outro mede o RMS da faixa de áudio recebida
via `AnalyserNode`. Foi assim que os problemas 1 e 3 apareceram.

## O que dá para melhorar

- Malha P2P não escala além de ~6 pessoas: um SFU resolveria, mas dobra a complexidade
- Não há autenticação: quem alcança a porta entra (é de propósito, uso entre amigos)
- Instalador não é assinado — o SmartScreen avisa na primeira execução
- Emojis são uma lista fixa em `app.js`; não há busca
- Sem testes automatizados
