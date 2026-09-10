# Servidor na nuvem

Guia para deixar um servidor de sinalização ligado 24h, para ninguém precisar
hospedar nem usar VPN externa. Quem já joga na mesma rede ou dentro de uma VPN
não precisa disto: o botão **Hospedar no meu PC** continua funcionando igual.

## O que muda (e o que não muda)

Só a **sinalização** vai para a nuvem: apresentar quem está online, repassar
SDP/ICE e guardar as salas e o histórico do chat. É pouco tráfego, tudo JSON.

**Voz, vídeo e a tela continuam P2P**, indo direto de um PC para o outro, como
sempre. O servidor não vê nem transporta mídia, então uma máquina fraca dá conta.

## Senha: obrigatória aqui

Na LAN ou dentro de uma VPN, quem alcança a porta entra, e isso é de propósito.
Exposto na internet aberta, não serve: qualquer um que descobrisse o endereço
entraria nas salas e ouviria a conversa.

Por isso, **sempre defina `DISCORDIA_SENHA` quando o servidor for público.** Com
ela ligada, um socket que não acertou a senha não recebe a lista de salas nem
consegue mandar mensagem, cai depois de 15 segundos calado, e é desconectado
depois de 3 tentativas erradas. O endereço `/health` também para de mostrar
nomes de sala e de quem está online.

Sem a variável, o servidor sobe sem senha e avisa no console. Use assim apenas
em rede local ou VPN.

## Variáveis

| Variável | Para que serve |
|---|---|
| `PORT` | Porta. As plataformas de hospedagem injetam esta variável sozinhas |
| `DISCORDIA_SENHA` | Senha de entrada. **Obrigatória** se o servidor for público |
| `DISCORDIA_NOME` | Nome que aparece na barra lateral do app (padrão: "Servidor Discordia") |
| `DISCORDIA_DADOS` | Pasta onde ficam `salas.json` e `historico.json` |

## Subindo

O `Dockerfile` na raiz sobe só o servidor. Serve para qualquer lugar que aceite
container: Fly.io, Render, Railway, uma VPS com Docker.

```bash
docker build -t discordia-servidor .
docker run -p 8080:8080 -e DISCORDIA_SENHA="uma-senha-boa" discordia-servidor
```

Numa VPS sem Docker, o servidor roda direto, sem build:

```bash
npm install ws
DISCORDIA_SENHA="uma-senha-boa" PORT=8080 node server/server.js
```

### Detalhes que costumam morder

**Use `wss://`, não `ws://`.** Toda plataforma de hospedagem termina TLS e serve
em HTTPS. O endereço que vai para os amigos fica `wss://seu-app.fly.dev` (sem
porta: o 443 é implícito). `ws://` num endereço HTTPS é recusado pelo navegador.

**Disco é temporário na maioria das camadas gratuitas.** Reiniciou, `salas.json`
e `historico.json` somem, e as salas voltam a ser só a Geral. Para não perder,
monte um volume em `/dados` (Fly.io: `fly volumes create`; Render: disco pago).

**Camada gratuita costuma dormir.** Serviço parado por inatividade demora alguns
segundos para acordar na primeira conexão. Se isso incomodar, um plano mínimo
pago resolve, ou um ping periódico no `/health`.

**O `/health` responde JSON** e serve para o healthcheck da plataforma.

## No app

Na tela de conexão, o pessoal põe o endereço em **Servidor** e a senha em
**Senha**, e clica em Conectar. Os dois campos ficam salvos para a próxima vez.

A senha fica guardada em texto no `settings.json` do perfil do usuário
(`%APPDATA%/Discordia`), do mesmo jeito que o histórico do chat. É uma senha
compartilhada de servidor entre amigos, não uma credencial pessoal — mas vale
saber que está lá.

## Quando a conexão não fecha

Mesmo com o servidor na nuvem, o áudio é P2P e depende dos dois lados
conseguirem se enxergar. Na maioria das combinações de NAT o STUN resolve (é o
que o app já usa). Em NAT simétrico, os dois lados até entram na sala e o chat
funciona, mas voz e tela não passam — nesse caso o que resolve é um servidor
TURN, que retransmite a mídia e por isso consome banda de verdade.
