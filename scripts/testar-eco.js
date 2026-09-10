/**
 * Banco de testes do cancelador de eco, fora do navegador.
 *
 * Simula o cenario real: o audio capturado da tela contem o som do jogo MAIS o eco
 * das vozes da chamada (que e o nosso proprio sinal atrasado e um pouco distorcido).
 * Mede quanto do eco sobra e quanto o som do jogo foi maltratado.
 *
 *   node scripts/testar-eco.js
 */
const fs = require('fs');
const path = require('path');

const TAXA = 48000;
const BLOCO = 128;

// ---- carrega o worklet com o minimo de ambiente que ele espera ----
function carregarProcessador() {
  let Classe = null;
  const contexto = {
    sampleRate: TAXA,
    AudioWorkletProcessor: class { constructor() { this.port = { onmessage: null, postMessage() {} }; } },
    registerProcessor: (_nome, cls) => { Classe = cls; },
    Math, Float32Array, Float64Array, Uint16Array, console,
  };
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'eco-worklet.js'), 'utf8');
  const fn = new Function(...Object.keys(contexto), codigo);
  fn(...Object.values(contexto));
  return Classe;
}

const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
const dB = (x) => (20 * Math.log10(Math.max(x, 1e-12))).toFixed(1);

/** Roda o processador sobre sinais inteiros e devolve a saida (canal 0). */
function rodar(Classe, mic, ref) {
  const p = new Classe();
  const n = mic.length;
  const saida = new Float32Array(n);
  const inL = new Float32Array(BLOCO), inR = new Float32Array(BLOCO);
  const refL = new Float32Array(BLOCO), refR = new Float32Array(BLOCO);
  const outL = new Float32Array(BLOCO), outR = new Float32Array(BLOCO);
  for (let i = 0; i + BLOCO <= n; i += BLOCO) {
    for (let k = 0; k < BLOCO; k++) {
      inL[k] = mic[i + k]; inR[k] = mic[i + k];
      refL[k] = ref[i + k]; refR[k] = ref[i + k];
    }
    outL.fill(0); outR.fill(0);
    p.process([[inL, inR], [refL, refR]], [[outL, outR]]);
    saida.set(outL, i);
  }
  return saida;
}

// ---------------- sinais de teste ----------------
const SEGUNDOS = 25;
const N = TAXA * SEGUNDOS;
const ATRASO = 1400;          // ~29 ms, na faixa medida no Windows

// "vozes da chamada": rajadas de ruido de 2 s a cada 3,5 s (fala intermitente)
const vozes = new Float32Array(N);
let x = 0;
for (let i = 0; i < N; i++) {
  const t = (i / TAXA) % 3.5;
  x = 0.85 * x + 0.5 * (Math.random() * 2 - 1);
  vozes[i] = t < 2 ? x * 0.30 : 0;
}

// "jogo": tom continuo mais um ruidinho de fundo
const jogo = new Float32Array(N);
for (let i = 0; i < N; i++) {
  jogo[i] = 0.10 * Math.sin((2 * Math.PI * 1000 * i) / TAXA) + 0.01 * (Math.random() * 2 - 1);
}

// eco: nosso sinal atrasado, com ganho diferente e um tico de distorcao nao linear
// (o Windows aplica efeitos no dispositivo - por isso o estagio linear nao basta)
const eco = new Float32Array(N);
for (let i = ATRASO; i < N; i++) {
  const v = vozes[i - ATRASO] * 0.85;
  eco[i] = v + 0.05 * v * Math.abs(v);
}

const micComEco = new Float32Array(N);
for (let i = 0; i < N; i++) micComEco[i] = jogo[i] + eco[i];

const Classe = carregarProcessador();
console.log('Rodando', SEGUNDOS, 's de audio...\n');

// (1) so o eco na entrada: mede quanto o cancelador segura
const soEco = rodar(Classe, eco, vozes);
// (2) jogo + eco: cenario real
const comEco = rodar(Classe, micComEco, vozes);
// (3) so o jogo: mede se o som do jogo passa intacto
const semEco = rodar(Classe, jogo, vozes);

// analisa so a segunda metade: da tempo do filtro convergir
const meio = Math.floor(N / 2);
const fatia = (a) => a.subarray(meio, N - BLOCO);

const a = fatia(comEco), b = fatia(semEco);
const vazamento = new Float32Array(a.length);
for (let i = 0; i < vazamento.length; i++) vazamento[i] = a[i] - b[i];

const ecoOriginal = rms(fatia(eco));
const ecoQueSobrou = rms(fatia(soEco));
const jogoEntrou = rms(fatia(jogo));
const jogoSaiu = rms(b);

console.log('eco que entrou .......', dB(ecoOriginal), 'dB');
console.log('eco que sobrou .......', dB(ecoQueSobrou), 'dB');
console.log('REDUCAO DO ECO .......', (20 * Math.log10(ecoOriginal / Math.max(ecoQueSobrou, 1e-12))).toFixed(1), 'dB');
console.log('eco no cenario real ..', dB(rms(vazamento)), 'dB  (inclui a modulacao do jogo)');
console.log('');
console.log('jogo na entrada ......', dB(jogoEntrou), 'dB');
console.log('jogo na saida ........', dB(jogoSaiu), 'dB');
console.log('perda do jogo ........', (20 * Math.log10(jogoEntrou / Math.max(jogoSaiu, 1e-12))).toFixed(1), 'dB');
