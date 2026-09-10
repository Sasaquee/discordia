/**
 * Gera os icones do Discordia a partir das artes em assets/:
 *   logo-discordia.png                        -> icone do app (exe, atalho, barra de tarefas, janela)
 *   logo-tipografia-discordia-horizontal.png  -> assinatura horizontal usada dentro do app
 *
 * O fundo escuro das artes e removido por preenchimento a partir das bordas, o que
 * preserva as partes escuras de dentro do desenho (o miolo do "D"). Depois recorta
 * a margem sobrando e reamostra para cada tamanho.
 *
 * Roda dentro do Electron (precisa do nativeImage para ler/reamostrar PNG):
 *   npm run icon
 */
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RAIZ = path.join(__dirname, '..');
const ASSETS = path.join(RAIZ, 'assets');
const BUILD = path.join(RAIZ, 'build');

const FONTE_ICONE = path.join(ASSETS, 'logo-discordia.png');
const FONTE_TIPO = path.join(ASSETS, 'logo-tipografia-discordia-horizontal.png');

// ---------------- PNG ----------------
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crcBuf]);
}
/** rgba: Buffer RGBA */
function toPNG(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------- ICO ----------------
function toDIB(rgba, S) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(S, 4);
  header.writeInt32LE(S * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(S * S * 4, 20);
  const xor = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const s = (y * S + x) * 4;
      const d = ((S - 1 - y) * S + x) * 4;
      xor[d] = rgba[s + 2]; xor[d + 1] = rgba[s + 1]; xor[d + 2] = rgba[s]; xor[d + 3] = rgba[s + 3];
    }
  }
  const and = Buffer.alloc(Math.ceil(S / 32) * 4 * S, 0);
  return Buffer.concat([header, xor, and]);
}
function toICO(imagens) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(imagens.length, 4);
  const entradas = [];
  const dados = [];
  let offset = 6 + imagens.length * 16;
  for (const img of imagens) {
    const e = Buffer.alloc(16);
    e[0] = img.size >= 256 ? 0 : img.size;
    e[1] = img.size >= 256 ? 0 : img.size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(img.data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += img.data.length;
    entradas.push(e);
    dados.push(img.data);
  }
  return Buffer.concat([head, ...entradas, ...dados]);
}

// ---------------- tratamento da arte ----------------
/** nativeImage -> {rgba, w, h} */
function paraRGBA(img) {
  const { width: w, height: h } = img.getSize();
  const bgra = img.toBitmap();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = bgra[i * 4 + 2];
    rgba[i * 4 + 1] = bgra[i * 4 + 1];
    rgba[i * 4 + 2] = bgra[i * 4];
    rgba[i * 4 + 3] = bgra[i * 4 + 3];
  }
  return { rgba, w, h };
}
function paraNative(rgba, w, h) {
  const bgra = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    bgra[i * 4] = rgba[i * 4 + 2];
    bgra[i * 4 + 1] = rgba[i * 4 + 1];
    bgra[i * 4 + 2] = rgba[i * 4];
    bgra[i * 4 + 3] = rgba[i * 4 + 3];
  }
  return nativeImage.createFromBitmap(bgra, { width: w, height: h });
}

/**
 * Remove o fundo comecando pelas bordas (flood fill). So apaga o que esta
 * ligado a borda, entao areas escuras internas do desenho continuam la.
 */
function tirarFundo({ rgba, w, h }, tolerancia = 42) {
  const fundo = [rgba[0], rgba[1], rgba[2]];
  const perto = (i) => {
    const d = Math.abs(rgba[i] - fundo[0]) + Math.abs(rgba[i + 1] - fundo[1]) + Math.abs(rgba[i + 2] - fundo[2]);
    return d <= tolerancia;
  };
  const visitado = new Uint8Array(w * h);
  const fila = [];
  const empilhar = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visitado[p]) return;
    visitado[p] = 1;
    if (perto(p * 4)) fila.push(p);
  };
  for (let x = 0; x < w; x++) { empilhar(x, 0); empilhar(x, h - 1); }
  for (let y = 0; y < h; y++) { empilhar(0, y); empilhar(w - 1, y); }

  while (fila.length) {
    const p = fila.pop();
    rgba[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    empilhar(x + 1, y); empilhar(x - 1, y); empilhar(x, y + 1); empilhar(x, y - 1);
  }
  // suaviza a borda: pixel opaco vizinho de transparente perde um pouco de alfa
  return { rgba, w, h };
}

/**
 * Alfa pela luminancia: a arte e brilho sobre quase-preto, entao o proprio brilho
 * vira a opacidade. Da borda limpa, sem o halo escuro que sobra do flood fill.
 * Usado nas pecas que ficam soltas sobre o fundo escuro do app.
 */
function chaveLuma({ rgba, w, h }, baixo = 12, alto = 70) {
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const a = Math.max(0, Math.min(1, (luma - baixo) / (alto - baixo)));
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  return { rgba, w, h };
}

/** Recorta ao conteudo visivel, com uma folga proporcional. */
function recortar({ rgba, w, h }, folga = 0.04) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { rgba, w, h };
  const px = Math.round((x1 - x0) * folga);
  const py = Math.round((y1 - y0) * folga);
  x0 = Math.max(0, x0 - px); y0 = Math.max(0, y0 - py);
  x1 = Math.min(w - 1, x1 + px); y1 = Math.min(h - 1, y1 + py);
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
  const out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    rgba.copy(out, y * nw * 4, ((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4);
  }
  return { rgba: out, w: nw, h: nh };
}

/** Centraliza numa tela quadrada transparente. */
function quadrado(img, lado) {
  const escala = Math.min(lado / img.w, lado / img.h);
  const nw = Math.max(1, Math.round(img.w * escala));
  const nh = Math.max(1, Math.round(img.h * escala));
  const menor = paraRGBA(paraNative(img.rgba, img.w, img.h).resize({ width: nw, height: nh, quality: 'best' }));
  const out = Buffer.alloc(lado * lado * 4, 0);
  const ox = ((lado - menor.w) / 2) | 0;
  const oy = ((lado - menor.h) / 2) | 0;
  for (let y = 0; y < menor.h; y++) {
    menor.rgba.copy(out, ((y + oy) * lado + ox) * 4, y * menor.w * 4, (y + 1) * menor.w * 4);
  }
  return { rgba: out, w: lado, h: lado };
}

/**
 * Coloca a marca sobre um bloco arredondado com a cor de fundo da propria arte.
 * Fica melhor como icone de app (aparece bem em barra clara ou escura) e some
 * com o halo que sobra do recorte do brilho.
 */
function blocoArredondado(img, lado, fundo, folga = 0.16) {
  const interno = Math.round(lado * (1 - folga * 2));
  const centro = quadrado(img, interno);
  const out = Buffer.alloc(lado * lado * 4, 0);
  const raio = lado * 0.22;
  const dist = (x, y) => {
    const qx = Math.abs(x - lado / 2) - (lado / 2 - raio);
    const qy = Math.abs(y - lado / 2) - (lado / 2 - raio);
    const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
    return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - raio;
  };
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const a = Math.max(0, Math.min(1, 0.5 - dist(x + 0.5, y + 0.5)));
      const i = (y * lado + x) * 4;
      out[i] = fundo[0]; out[i + 1] = fundo[1]; out[i + 2] = fundo[2];
      out[i + 3] = Math.round(a * 255);
    }
  }
  const ox = ((lado - centro.w) / 2) | 0;
  const oy = ((lado - centro.h) / 2) | 0;
  for (let y = 0; y < centro.h; y++) {
    for (let x = 0; x < centro.w; x++) {
      const s = (y * centro.w + x) * 4;
      const a = centro.rgba[s + 3] / 255;
      if (!a) continue;
      const d = ((y + oy) * lado + (x + ox)) * 4;
      for (let c = 0; c < 3; c++) out[d + c] = Math.round(out[d + c] * (1 - a) + centro.rgba[s + c] * a);
      out[d + 3] = Math.max(out[d + 3], Math.round(a * 255));
    }
  }
  return { rgba: out, w: lado, h: lado };
}

function redimensionarAltura(img, altura) {
  const nw = Math.max(1, Math.round(img.w * (altura / img.h)));
  return paraRGBA(paraNative(img.rgba, img.w, img.h).resize({ width: nw, height: altura, quality: 'best' }));
}

// ---------------- main ----------------
app.whenReady().then(() => {
  try {
    if (!fs.existsSync(FONTE_ICONE)) {
      console.error('Faltando', FONTE_ICONE);
      return app.exit(1);
    }
    fs.mkdirSync(BUILD, { recursive: true });

    const arte = paraRGBA(nativeImage.createFromPath(FONTE_ICONE));
    const corFundo = [arte.rgba[0], arte.rgba[1], arte.rgba[2]];
    const marca = recortar(tirarFundo(arte, 60), 0.02);
    console.log('Marca recortada:', marca.w + 'x' + marca.h, '| fundo da arte:', corFundo.join(','));

    const tile = (lado) => blocoArredondado(marca, lado, corFundo);
    const q512 = tile(512);
    fs.writeFileSync(path.join(BUILD, 'icon.png'), toPNG(q512.rgba, 512, 512));
    const q256 = tile(256);
    fs.writeFileSync(path.join(ASSETS, 'logo.png'), toPNG(q256.rgba, 256, 256));
    // versao so com a marca (sem bloco), para usar solta sobre o fundo escuro do app
    const solta = quadrado(recortar(chaveLuma(paraRGBA(nativeImage.createFromPath(FONTE_ICONE))), 0.02), 256);
    fs.writeFileSync(path.join(ASSETS, 'marca.png'), toPNG(solta.rgba, 256, 256));

    const tamanhos = [16, 24, 32, 48, 64, 128];
    const imagens = tamanhos.map((s) => ({ size: s, data: toDIB(tile(s).rgba, s) }));
    imagens.push({ size: 256, data: toPNG(q256.rgba, 256, 256) });
    fs.writeFileSync(path.join(BUILD, 'icon.ico'), toICO(imagens));

    if (fs.existsSync(FONTE_TIPO)) {
      const tipo = recortar(chaveLuma(paraRGBA(nativeImage.createFromPath(FONTE_TIPO))), 0.02);
      const barra = redimensionarAltura(tipo, 72); // usada com altura menor no CSS
      fs.writeFileSync(path.join(ASSETS, 'wordmark.png'), toPNG(barra.rgba, barra.w, barra.h));
      console.log('Assinatura horizontal:', barra.w + 'x' + barra.h);
    }

    console.log('Icones gerados a partir das artes em assets/.');
    app.exit(0);
  } catch (err) {
    console.error('Falhou:', err);
    app.exit(1);
  }
});
