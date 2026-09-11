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

## Link da internet (túnel)

Quem hospeda gera um link e manda para os amigos, que entram de qualquer rede. Isso
substitui a VPN de LAN e o encaminhamento de porta no roteador.

Por dentro é o **cloudflared** (`bin/cloudflared.exe`, baixado por
`npm run cloudflared` e empacotado via `extraResources`). O `main.js` roda
`cloudflared tunnel --url http://localhost:<porta>` e pesca no log a URL
`https://*.trycloudflare.com`, que o renderer converte para `wss://`.

- **Só a sinalização passa pelo túnel.** Voz, vídeo e tela continuam P2P, direto entre
  os PCs. Medido: a ida e volta da sinalização pelo túnel fica em ~28 ms contra ~1 ms
  em rede local, e isso só afeta entrar em sala e chat.
- **O link morre quando o app fecha** — é um *quick tunnel*, sem conta na Cloudflare.
  `before-quit` mata o processo; se o cloudflared cair sozinho, o main avisa o renderer
  pelo evento `tunnel:down`.
- **O convite mora dentro do app** (`Convidar a galera`, na barra lateral), não só na
  tela de hospedagem: o botão *Hospedar no meu PC* entra na chamada logo em seguida e
  aquela tela sai da frente, então o link precisava continuar ao alcance.
- **`normalizeUrl` não gruda a porta padrão em `wss://`.** Um endereço de túnel roda na
  443; acrescentar `:45070` quebrava a conexão. A porta padrão só entra em `ws://`, e um
  endereço sem esquema vira `ws://` se for IP ou localhost, ou `wss://` se for domínio.

## Cartão de perfil

Cada pessoa tem um cartão: foto, nome, pronomes, uma linha de bio, status
(disponível / ocupado / ausente) e a cor da faixa. Tudo isso viaja no `identify` e
volta no `peerInfo`, então não existe cadastro nem servidor de perfil: o cartão é a
pessoa se apresentando na sala.

Limites ficam no servidor (bio 160, pronomes 20) e faixa e status são listas fechadas,
porque o campo vem do cliente e cliente mente.

O que o cartão mostra **além** do que a pessoa escreveu são as etiquetas de agora: em
que sala está, há quanto tempo entrou (`entrouEm`, marcado no `join`), se está com o
microfone mudo, compartilhando tela ou com a câmera ligada, e se você silenciou ela.
Essa parte é a que um perfil de rede social não teria como ter.

No cartão também cabem **imagem de faixa** (aceita GIF, que vai inteiro para não
perder a animação), **estilo de nick** (10 opções, de cor sólida a gradiente animado) e
até **3 cargos** com cor, que a pessoa mesma escreve. Não existe hierarquia no app, então
cargo aqui é auto-declarado: é identidade, não permissão.

O banner é o campo mais pesado que trafega (limite de ~1,3 MB, contra 400 KB do avatar)
e vai para todos os pares no `identify`. Se um dia pesar demais numa sala cheia, é o
primeiro lugar para olhar.

Cuidado ao mexer nas amostras de estilo de nick: o gradiente é recortado no texto
(`background-clip:text` com `color:transparent`), então o elemento que mostra o nome não
pode ter fundo próprio, senão o texto some. Por isso a amostra é um `<span>` dentro do
botão, e não o botão.

O perfil tem **duas camadas**, como no Discord: clicar na pessoa abre o **mini**
(faixa, foto, nick, status, bio e volume, ali mesmo, sem sair da tela), e clicar no
**nick dentro do mini** abre o cartão completo. O mini pára a propagação do clique,
senão o mesmo clique que o abre chega no fechador global de menus e ele nunca aparece.

O ponto de status é um elemento irmão do avatar (`.av-status > .ponto`), não sombra:
sombra vazava por trás da foto e ficava com cara de bola solta.

A **nota** ("só você vê") fica no `settings.json` da sua máquina e nunca é enviada. A
chave dela é o **nome** da pessoa, não o id: o id é sorteado a cada conexão e a nota
não sobreviveria à próxima chamada.

## Reconexão, atualização e apertar para falar

**Reconexão.** Quando a sinalização cai sem ser a pedido (wi-fi oscilou, o túnel piscou,
o host reiniciou), o app segura a tela da chamada e tenta voltar sozinho com espera
crescente (1s, 2s, 4s, 6s, 8s), mostrando `reconectando n/5` na barra de título. Ao
voltar, ele entra de novo na sala em que estava. Sair de propósito marca
`S.saindoDeProposito`, senão o botão de sair dispararia a reconexão.

**Atualização.** `electron-updater` lendo as Releases do GitHub (`build.publish`). O
instalador de cada versão já vai anexado lá; o app baixa em segundo plano e só instala
quando a pessoa clica. **Isso só funciona a partir da versão que publicar o `latest.yml`
junto do `.exe`** — sem esse arquivo o updater não acha o feed.

**Apertar para falar.** Precisa de hook de teclado do sistema: tecla no renderer só
chega com o app em foco, e `globalShortcut` avisa quando aperta mas nunca quando solta.
Por isso o `uiohook-napi` (nativo, vai fora do asar via `asarUnpack`).

O hook enxerga tudo que a pessoa digita, então ele: só liga quando o "apertar para
falar" é ativado (padrão desligado), compara o código da tecla com a configurada e
descarta o resto, e não guarda nem envia nada. O microfone é fechado por ganho no
`applyMicEnabled`, o mesmo caminho do mudo.

Detalhe que vale saber: os atalhos `Ctrl+Shift+M` e `Ctrl+Shift+D` **não são globais** —
são `keydown` no renderer e só funcionam com o app em foco. Com o hook já no projeto,
torná-los globais é pouco trabalho.

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
**71 dB de redução do eco com 1,7 dB de perda no áudio do jogo.**

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

**7f. Copiar para a área de transferência é pelo processo principal.**
`navigator.clipboard.writeText()` precisa da permissão `clipboard-sanitized-write`, que
o handler de permissões do app nega — e a promessa rejeitada era engolida por um
`catch {}`, então o botão "copiar" não fazia nada e não avisava. Agora vai por IPC
(`API.copiar`), usando o módulo `clipboard` do Electron, que não depende de permissão.

**7g. Firewall: script em arquivo, não `-EncodedCommand`.** A versão antiga montava um
comando codificado com `-ErrorAction SilentlyContinue`: quando falhava, o motivo sumia e
a interface só dizia "não foi possível". Agora o trabalho vai num `.ps1` temporário que
grava o resultado num log, o log volta para a interface, e usamos `netsh advfirewall`
(não precisa carregar o módulo NetSecurity, que é lento e falha em algumas instalações).
Se o usuário recusar o UAC, a mensagem diz isso.

**7h. Teto de banda alto de propósito.** Os presets de qualidade agora vão de 5 a
30 Mbps (eram 2,5 a 12). WebRTC só usa o que a rede aguenta — o teto é um limite, não
um piso. Com teto baixo o codificador borra a imagem para caber, que era a causa da
tela pixelada. Junto: `scaleResolutionDownBy = 1` (nunca reduzir a resolução) e
`degradationPreference = 'balanced'` (antes `maintain-framerate`, que esmagava a nitidez).
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

Cliente → servidor: `auth`, `identify` (nome, foto, bio, pronomes, faixa, banner, estilo do nick, cargos, status), `join`, `leave`, `state`, `signal`, `chat`,
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
