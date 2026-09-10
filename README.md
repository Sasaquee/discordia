<p align="center">
  <img src="assets/wordmark.png" alt="Discordia" height="64" />
</p>

<p align="center">
  Voz, vídeo e <b>compartilhamento de tela com o áudio do PC</b> — sem nuvem, sem conta, sem mensalidade.
</p>

---

Um app de desktop para Windows no estilo Discord, feito em Electron + WebRTC. Quem
hospeda roda o servidor dentro do próprio app; áudio e vídeo vão direto de um PC para o
outro (P2P), sem passar por servidor nenhum.

## O que ele faz

- **Chamada de voz** em salas, com indicador de quem está falando
- **Compartilhar tela com o som do computador** — jogo, YouTube, música. Escolhe tela ou
  janela, até resolução nativa a 60fps
- **Mutar/desmutar** (`Ctrl+Shift+M`) e **ensurdecer** (`Ctrl+Shift+D`)
- **Entrar e sair da chamada** num clique; salas ficam salvas
- **Câmera** (opcional)
- **Layout ajustável**: Auto, Grade ou Foco, com tamanho dos quadros no slider e botão
  para ocultar quem está sem vídeo
- **Tela cheia** (`F11`) mostrando só os vídeos
- **Volume individual** de cada pessoa e de cada tela compartilhada — no botão direito ou
  passando o mouse no quadro (vai até 200%)
- **Perfil com foto**, e dá para ver o perfil dos outros
- **Chat** com histórico salvo, emojis, imagens (colar, arrastar ou anexar), figurinhas
  personalizadas e GIFs do Giphy
- **Efeitos sonoros** (soundboard) com áudios seus, teclas `1`–`9`, tocando para a sala
  mesmo com o microfone mudo

## Instalação

Rode o `Discordia-Setup-<versão>.exe` da pasta `dist/` (ou da aba Releases).

> O instalador não é assinado digitalmente, então o Windows mostra
> "SmartScreen: aplicativo não reconhecido" na primeira vez. Clique em
> **Mais informações → Executar assim mesmo**. Assinar exige certificado pago.

## Como usar

1. Abra o app e escreva seu nome.
2. **Quem vai hospedar** clica em **Hospedar no meu PC**. Aparecem os endereços
   (`ws://SEU-IP:45070`); copie e mande para a galera.
3. **Os outros** colam esse endereço no campo *Servidor* e clicam **Conectar**.
4. Todo mundo cai na sala **Geral**. Clique em **Tela** para compartilhar.

Na mesma rede/Wi-Fi ou dentro de uma VPN de LAN funciona direto. Pela internet aberta,
quem hospeda precisa liberar a porta **45070 (TCP)** no roteador — ou rodar o servidor
numa VPS:

```bash
node server/server.js 45070
```

## Usando com uma VPN de LAN (LANVPN, Hamachi, Radmin, ZeroTier...)

É a forma mais fácil de jogar junto pela internet. Regras:

1. Todo mundo conectado na VPN **antes** de abrir o Discordia.
2. **Quem hospeda a VPN é a melhor escolha para hospedar o Discordia** — todos alcançam
   essa máquina com certeza.
3. Na tela de hospedagem, o endereço da VPN aparece **primeiro, com a etiqueta verde
   `VPN`** e o nome do adaptador. É esse que deve ser copiado — não o `192.168.x.x`,
   que é a rede de casa e os amigos não alcançam.
4. Clique em **Liberar no firewall** (pede confirmação de administrador). Sem isso o
   Windows costuma barrar a entrada dos outros.

O app já vem ajustado para VPN: os candidatos de conexão saem com o IP real em vez do
disfarce mDNS do Chromium (que não atravessa o túnel). Sem esse ajuste o chat conecta
mas voz e tela não passam.

Se **dois membros que não hospedam a VPN** não se ouvirem, o problema é o roteamento da
própria VPN (ela precisa encaminhar tráfego entre clientes, não só cliente↔servidor).

## Desenvolvimento

```bash
npm install
npm start        # roda o app
npm run server   # só o servidor de sinalização
npm run icon     # regenera os ícones a partir das artes em assets/
npm run dist     # gera o instalador
```

Detalhes de arquitetura, decisões técnicas e como testar estão em
[CONTEXTO.md](CONTEXTO.md).

## Estrutura

```
electron/main.js     processo principal: janela, captura de tela com áudio, IPC, servidor embutido
electron/preload.js  ponte segura renderer ↔ main
renderer/            interface: HTML/CSS/JS puro, WebRTC, chat, soundboard
server/server.js     sinalização WebSocket: salas, presença, SDP/ICE, chat e histórico
scripts/make-icon.js gera os ícones a partir das artes da marca
```

## Licença

MIT
