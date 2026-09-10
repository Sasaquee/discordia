# Servidor de sinalizacao do Discordia.
# So o servidor entra na imagem: o app de desktop nao roda aqui.
# Audio e video continuam P2P entre os PCs, isto aqui so apresenta a galera.
FROM node:22-alpine

WORKDIR /app

# ws e a unica dependencia do servidor
COPY package.json ./
RUN npm install ws@^8.18.0 --omit=dev --no-audit --no-fund

COPY server ./server

# a plataforma injeta PORT; DISCORDIA_SENHA e obrigatoria na internet aberta
ENV PORT=8080
ENV DISCORDIA_DADOS=/dados
EXPOSE 8080

# quem quiser guardar salas e historico entre reinicios monta um volume em /dados
VOLUME ["/dados"]

CMD ["node", "server/server.js"]
