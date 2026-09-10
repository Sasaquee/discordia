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
| `renderer/eco-worklet.js` | Cancelador de eco do compartilhamento de tela (roda em AudioWorklet) |
| `scripts/testar-eco.js` | Banco de testes do cancelador, fora do navegador |
| `server/server.js` | Sinalização WebSocket + salas + histórico do chat |
| `scripts/make-icon.js` | Gera `build/icon.png/.ico` e `assets/wordmark.png` a partir das artes |

## Identidade visual

Tudo sai da marca, não de um tema genérico. O `:root` do `styles.css` guarda os tokens; use
eles em vez de cravar cor no componente.

- **Cores**: fundo quase preto azulado (`--void` … `--raised`, do fundo para a frente) e o
  gradiente do ícone (`--grad`: ciano `#45dcff` → índigo `#5f6ff5` → magenta `#c02ee0`).
  As bordas (`--line*`) são luz fraca em azul, nunca cinza morto.
- **Onde o gradiente pode aparecer**: marca, botão primário, barra da sala ativa, medidor do
  microfone, botão de enviar e a faixa lateral do toast. Em mais lugares que isso vira enfeite.
- **Estados têm cor fixa**: ciano = ligado/ativo (microfone aberto, compartilhando),
  `--danger` = mudo/sair, `--live` = AO VIVO, `--good` = servidor no ar.
- **Tipografia**: `--font-display` (Bahnschrift, já vem no Windows) em títulos, rótulos
  maiúsculos e botões de segmento; `--font` (Segoe UI) no texto corrido; `--font-mono`
  (Cascadia/Consolas) em tudo que é dado: endereço do servidor, latência, horário, volume, teclas.
- **Motivo gráfico**: as duas barras verticais do balão de fala do ícone. Elas aparecem
  animadas em `.tile.speaking::before/::after` (quem está falando) e viram a barra de gradiente
  em `.room.active .room-btn::before` (sala ativa). É o único movimento dentro da chamada, de
  propósito: animação em call disputa atenção com o jogo.
- **Movimento**: só na tela de conexão (a faixa `.connect-eq`), no indicador de fala e nos
  hovers. Tudo desligado em `prefers-reduced-motion`.

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

**7b. Cancelador de eco do compartilhamento** (`renderer/eco-worklet.js`). O loopback do
Windows captura a mistura inteira do dispositivo, inclusive as vozes da chamada que o
próprio app está tocando — por isso, sem tratar, todo mundo se ouve quando alguém
compartilha. O AEC do Chromium **não** resolve (medido: cancela 3 dB, porque a referência
dele é o mix do dispositivo inteiro). O cancelador tem dois estágios:

1. **Linear** — mede o atraso por correlação cruzada em sinal decimado (48k → 6k, até
   400 ms) e roda um NLMS de 1024 taps alinhado nele. Sozinho dá 7–20 dB: o Windows
   aplica efeitos não lineares no dispositivo, então o eco não é cópia exata.
2. **Supressor por coerência** — FFT de 512, salto de 256, janela raiz-de-Hann. Por faixa
   de frequência, compara o resíduo com a referência: onde os dois "andam juntos" é eco e
   abaixa; onde não, é som do jogo e passa.

Medido em `npm run testar-eco` (banco de testes offline, sem precisar abrir o app):
**48 dB de redução do eco com 1 dB de perda no áudio do jogo.**

Detalhes que quebram se mexer sem cuidado:

- Toda a saída de áudio do app passa por `S.saidaMix` — é essa a referência do
  cancelador. Nunca ligue nada direto no `ctx.destination`, senão aquele som não é
  cancelado e volta como eco.
- A janela precisa ser **raiz de Hann**: com Hann puro a soma dos quadrados oscila entre
  0,5 e 1, o áudio sai ondulado e ~3 dB mais baixo.
- O passo do NLMS (`MU = 0.15`) foi medido: maior converge rápido mas deixa resíduo;
  menor congela antes de convergir com o áudio do jogo tocando junto.
- A adaptação só acontece quando há som nosso tocando (`PISO_REF`). No silêncio entre as
  falas o filtro estaria perseguindo o áudio do jogo e se desmancharia.

Existe também o **modo cinema** no diálogo de compartilhar: zera a saída do app enquanto
compartilha. Eco zero de forma determinística, em troca de não ouvir a chamada.

**7c. Vídeo fluido: H264 pedido pelos dois lados.** Sem pedir codec, a chamada usa VP8 por
software e o compartilhamento cai para 960x540@18fps. Com `setCodecPreferences` colocando
H264 na frente — **nas duas pontas**, porque quem responde a negociação também escolhe o
codec — o Chromium passa a usar o `MediaFoundationVideoEncodeAccelerator` (GPU) e segura
1920x1080 com `qualityLimitationReason: none`. Junto: `contentHint = 'motion'` na faixa de
vídeo, `degradationPreference = 'maintain-framerate'` e `maxFramerate` nos encodings.

**7d. O palco não é reconstruído à toa.** `renderStage()` compara uma assinatura do layout
antes de mexer no DOM. Re-anexar um `<video>` faz o decodificador engasgar, e antes
qualquer mudança de estado (alguém mutou) reconstruía tudo.

**7e. Janela maximizada.** Além do `titleBarStyle: 'hidden'`, o evento `maximize` encaixa a
janela na `workArea` do monitor. Em alguns PCs a janela maximizada fica maior que a área
útil e a barra de tarefas cobre a parte de baixo do app.

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

Cliente → servidor: `auth`, `identify`, `join`, `leave`, `state`, `signal`, `chat`,
`delete-room`, `rename-room`, `move-room`, `clear-history`, `ping`.
Servidor → cliente: `hello`, `auth-ok`, `auth-fail`, `rooms`, `joined`, `history`,
`left`, `peer-join`, `peer-leave`, `peer-state`, `signal`, `chat`, `room-renamed`, `pong`.

**Senha (só quando configurada).** Sem `senha` no `createServer`, nada muda: quem
alcança a porta entra, que é o certo para LAN e VPN. Com senha, o `hello` sai com
`precisaSenha: true` e o socket fica em quarentena — só a mensagem `auth` é lida,
qualquer outra é descartada, a lista de salas não é enviada, cai depois de 15s
calado e é desconectado (código 4003) depois de 3 tentativas erradas. A comparação
é `timingSafeEqual` sobre SHA-256 dos dois lados, para o tempo de resposta não
entregar nada. O `/health` também para de listar salas nesse modo. Ver `SERVIDOR.md`.

Sobre as salas: `knownRooms` guarda **a ordem** em que elas aparecem na lista, não só
quais existem — por isso `rename-room` troca o nome na posição em vez de remover e
adicionar, e `move-room` reconstrói o conjunto inteiro. Renomear leva junto o histórico
do chat e atualiza o `ws.room` de quem já está dentro; a sala `Geral` não pode ser
renomeada nem apagada, porque é para onde todo mundo cai ao entrar.

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

## Continuando em outra máquina

```bash
git clone https://github.com/Sasaquee/discordia.git
cd discordia
npm install
npm start
```

As artes da marca (`logo-discordia.png`, `logo-tipografia-discordia-horizontal.png`) estão
versionadas em `assets/`; `npm run icon` regera `build/icon.png`, `build/icon.ico`,
`assets/logo.png` e `assets/wordmark.png` a partir delas. O instalador sai em `dist/` com
`npm run dist` (na primeira vez o electron-builder baixa Electron e NSIS, uns 300 MB).

Se `npm run dist` falhar em "Cannot create symbolic link ... winCodeSign", é o cache do
electron-builder tentando extrair symlinks de macOS sem privilégio no Windows. Solução
usada aqui: baixar o `winCodeSign-2.6.0.7z` do repositório electron-builder-binaries e
extrair à mão (excluindo a pasta `darwin`) em
`%LOCALAPPDATA%/electron-builder/Cache/winCodeSign/winCodeSign-2.6.0`.

Para mexer no cancelador de eco, use `npm run testar-eco`: ele carrega o worklet no Node
com um ambiente mínimo, gera 25 s de áudio sintético (fala intermitente + jogo + eco
atrasado e distorcido) e imprime a redução em dB. Muito mais rápido e preciso que abrir
duas instâncias do app.

## O que dá para melhorar

- Malha P2P não escala além de ~6 pessoas: um SFU resolveria, mas dobra a complexidade
- Não há autenticação: quem alcança a porta entra (é de propósito, uso entre amigos)
- Instalador não é assinado — o SmartScreen avisa na primeira execução
- Emojis são uma lista fixa em `app.js`; não há busca
- Sem testes automatizados
