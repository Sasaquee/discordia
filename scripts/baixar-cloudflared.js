/**
 * Baixa o cloudflared para `bin/`, que e o que gera o link da internet na tela
 * de hospedagem. O binario nao vai para o git (55 MB), entao quem clonou o repo
 * roda isto uma vez - o `npm run dist` ja chama sozinho.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const DESTINO = path.join(__dirname, '..', 'bin', 'cloudflared.exe');
const URL = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
const MINIMO = 10 * 1024 * 1024; // arquivo menor que isso e pagina de erro, nao o programa

function baixar(url, destino, saltos = 0) {
  return new Promise((resolve, reject) => {
    if (saltos > 5) return reject(new Error('redirecionou demais'));
    https.get(url, { headers: { 'User-Agent': 'discordia-build' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.resume();
        return resolve(baixar(res.headers.location, destino, saltos + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const total = Number(res.headers['content-length'] || 0);
      let lidos = 0;
      let ultimo = -1;
      const arquivo = fs.createWriteStream(destino + '.parcial');
      res.on('data', (c) => {
        lidos += c.length;
        if (total) {
          const pct = Math.floor((lidos / total) * 10) * 10;
          if (pct !== ultimo) { ultimo = pct; process.stdout.write('\r  baixando cloudflared: ' + pct + '%'); }
        }
      });
      res.pipe(arquivo);
      arquivo.on('finish', () => arquivo.close(() => resolve()));
      arquivo.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  if (fs.existsSync(DESTINO) && fs.statSync(DESTINO).size > MINIMO) {
    console.log('cloudflared ja esta em bin/, nao vou baixar de novo');
    return;
  }
  fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
  console.log('Baixando cloudflared de github.com/cloudflare/cloudflared (release oficial)...');
  try {
    await baixar(URL, DESTINO);
    const parcial = DESTINO + '.parcial';
    const tamanho = fs.statSync(parcial).size;
    if (tamanho < MINIMO) {
      fs.unlinkSync(parcial);
      throw new Error('veio pequeno demais (' + tamanho + ' bytes)');
    }
    fs.renameSync(parcial, DESTINO);
    console.log('\r  cloudflared salvo em bin/ (' + (tamanho / 1048576).toFixed(1) + ' MB)      ');
  } catch (err) {
    console.error('\nNao consegui baixar o cloudflared:', err.message);
    console.error('Baixe na mao de https://github.com/cloudflare/cloudflared/releases');
    console.error('e salve como bin/cloudflared.exe');
    process.exit(1);
  }
})();
