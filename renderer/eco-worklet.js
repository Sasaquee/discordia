/**
 * Cancelador de eco do compartilhamento de tela.
 *
 * O problema: no Windows, o "loopback" captura a mistura inteira que sai da placa de
 * som - inclusive as vozes da chamada que o proprio Discordia esta tocando. Sem tratar,
 * essas vozes voltam para quem falou.
 *
 * A favor: esse eco e digital, nao acustico. Captura e reproducao usam o mesmo relogio
 * do dispositivo, entao o eco e o nosso proprio sinal atrasado por um valor fixo
 * (dezenas de milissegundos), sem desvio de clock.
 *
 *   entrada 0 = audio capturado da tela (jogo + vozes da chamada)
 *   entrada 1 = referencia: tudo que o app esta tocando (so as vozes)
 *
 * Etapas:
 *   1) mede o atraso por correlacao cruzada do sinal decimado (funciona com voz e
 *      ruido; a versao por envoltoria so funcionava com tons)
 *   2) filtro adaptativo NLMS alinhado nesse atraso subtrai o eco
 *   3) mede o quanto reduziu (ERLE). Se estiver ruim, procura o atraso de novo.
 */

const TAPS = 1024;            // ~21 ms de filtro adaptativo
const MU = 0.15;              // medido: passo maior converge rapido mas deixa residuo;
                              // menor congela antes de convergir com o jogo tocando junto
const PISO_REF = 1e-5;        // energia media minima da referencia para adaptar
const RING = 131072;          // potencia de 2 (~2,7 s): permite indexar com mascara
const MASK = RING - 1;
const DEC = 8;                // decimacao para a busca de atraso (48k -> 6k)
const DEC_RING = 12000;       // 2 s decimados
const JANELA = 4096;          // ~0,68 s usados na correlacao
const LAG_MAX = 2400;         // ate 400 ms de atraso procurado
const LAGS_POR_CICLO = 24;    // busca fatiada para nao travar o audio

// ---- supressor por coerencia (estagio 2) ----
const NFFT = 512;             // ~10,7 ms de janela
const HOP = 256;
const BINS = NFFT / 2 + 1;
const SUAVE = 0.85;           // memoria das medias por faixa
const RESIDUO = 0.35;         // fracao do eco que o estagio linear costuma deixar passar
const GANHO_MIN = 0.04;       // -28 dB: nao zera de vez, evita som engolido

/** FFT radix-2 iterativa, com tabelas prontas. */
class FFT {
  constructor(n) {
    this.n = n;
    this.cos = new Float32Array(n / 2);
    this.sin = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      this.cos[i] = Math.cos((-2 * Math.PI * i) / n);
      this.sin[i] = Math.sin((-2 * Math.PI * i) / n);
    }
    this.rev = new Uint16Array(n);
    const bits = Math.round(Math.log2(n));
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
      this.rev[i] = r;
    }
  }
  /** Transforma no lugar. Passe inv=true para a inversa (ja normaliza). */
  run(re, im, inv) {
    const n = this.n;
    for (let i = 0; i < n; i++) {
      const j = this.rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let tam = 2; tam <= n; tam <<= 1) {
      const passo = n / tam;
      const meio = tam >> 1;
      for (let i = 0; i < n; i += tam) {
        for (let j = 0; j < meio; j++) {
          const c = this.cos[j * passo];
          const s = inv ? -this.sin[j * passo] : this.sin[j * passo];
          const a = i + j, b = a + meio;
          const tr = re[b] * c - im[b] * s;
          const ti = re[b] * s + im[b] * c;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
    if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
}

class CanceladorEco extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ref = new Float32Array(RING);
    this.escrita = 0;
    // um filtro so: o eco e o mesmo nos dois canais (as vozes tocam centralizadas),
    // entao adaptamos no downmix e subtraimos o mesmo sinal dos dois lados
    this.w = new Float32Array(TAPS);
    this.energiaJanela = 0;
    this.desdeRecalculo = 0;
    this.desdeTravar = 0;
    this.atraso = 0;
    this.travado = false;
    this.ligado = true;

    // sinais decimados, usados so para achar o atraso
    this.decRef = new Float32Array(DEC_RING);
    this.decMic = new Float32Array(DEC_RING);
    this.decPos = 0;
    this.decCheio = 0;
    this.accRef = 0; this.accMic = 0; this.accN = 0;

    this.busca = null;         // estado da busca fatiada

    // --- estagio 2: supressor por coerencia ---
    this.fft = new FFT(NFFT);
    this.janela = new Float32Array(NFFT);
    // raiz de Hann: analise e sintese usam a mesma janela, e o produto (Hann) soma
    // exatamente 1 com 50% de sobreposicao. Com Hann puro o sinal sai ondulado e ~3 dB
    // mais baixo, porque a soma dos quadrados varia entre 0,5 e 1.
    for (let i = 0; i < NFFT; i++) {
      this.janela[i] = Math.sqrt(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / NFFT));
    }
    this.entradaCh = [new Float32Array(NFFT), new Float32Array(NFFT)];
    this.entradaRef = new Float32Array(NFFT);
    this.entradaEco = new Float32Array(NFFT);   // o que o estagio 1 achou que era eco
    this.reY = new Float32Array(NFFT); this.imY = new Float32Array(NFFT);
    this.saidaCh = [new Float32Array(NFFT), new Float32Array(NFFT)];
    this.preencher = 0;
    this.prontos = 0;
    this.pronto = [new Float32Array(HOP), new Float32Array(HOP)]; // trecho ja tratado, pronto para sair
    this.tmpRe = new Float32Array(NFFT);
    this.re = new Float32Array(NFFT); this.im = new Float32Array(NFFT);
    this.reR = new Float32Array(NFFT); this.imR = new Float32Array(NFFT);
    this.pxx = new Float32Array(BINS);
    this.pyy = new Float32Array(BINS);
    this.pee = new Float32Array(BINS);
    this.pxeRe = new Float32Array(BINS);
    this.pxeIm = new Float32Array(BINS);
    this.ganho = new Float32Array(BINS).fill(1);

    // medicao de desempenho (ERLE)
    this.energiaEntrada = 0;
    this.energiaSaida = 0;
    this.amostrasMedidas = 0;

    this.port.onmessage = (e) => {
      const d = e.data;
      if (d === 'reset') this.reiniciar();
      else if (d && d.ligado !== undefined) this.ligado = !!d.ligado;
    };
  }

  reiniciar() {
    this.w.fill(0);
    this.energiaJanela = 0;
    this.desdeRecalculo = 0;
    this.desdeTravar = 0;
    this.travado = false;
    this.busca = null;
  }

  /** Soma a energia da janela de referencia usada pelo filtro agora. */
  recalcularEnergia() {
    const base = (this.escrita - this.atraso) & MASK;
    let e = 0;
    for (let k = 0; k < TAPS; k++) {
      const x = this.ref[(base - k) & MASK];
      e += x * x;
    }
    this.energiaJanela = e;
    this.desdeRecalculo = 0;
  }

  /** Copia os trechos recentes para a busca nao mudar de chao no meio do caminho. */
  iniciarBusca() {
    if (this.decCheio < JANELA + LAG_MAX) return;
    const mic = new Float32Array(JANELA);
    const ref = new Float32Array(JANELA + LAG_MAX);
    const fim = this.decPos; // proxima posicao livre = "agora"
    for (let i = 0; i < JANELA; i++) {
      mic[i] = this.decMic[(fim - JANELA + i + DEC_RING) % DEC_RING];
    }
    for (let i = 0; i < JANELA + LAG_MAX; i++) {
      ref[i] = this.decRef[(fim - JANELA - LAG_MAX + i + DEC_RING) % DEC_RING];
    }
    // energia acumulada da referencia: normaliza cada atraso em O(1)
    const soma2 = new Float64Array(ref.length + 1);
    for (let i = 0; i < ref.length; i++) soma2[i + 1] = soma2[i] + ref[i] * ref[i];
    let energiaRef = 0;
    for (let i = 0; i < ref.length; i++) energiaRef += ref[i] * ref[i];
    if (energiaRef < 1e-4) return; // referencia em silencio: nao da para medir

    this.busca = { mic, ref, soma2, lag: 0, melhor: 0, melhorLag: -1 };
  }

  /** Faz um pedaco da correlacao por ciclo de audio. */
  continuarBusca() {
    const b = this.busca;
    if (!b) return;
    const L = LAG_MAX;
    for (let c = 0; c < LAGS_POR_CICLO && b.lag <= L; c++, b.lag++) {
      const off = L - b.lag;
      let num = 0;
      for (let i = 0; i < JANELA; i++) num += b.mic[i] * b.ref[i + off];
      const den = Math.sqrt(b.soma2[off + JANELA] - b.soma2[off]) + 1e-9;
      const pontos = num / den;
      if (pontos > b.melhor) { b.melhor = pontos; b.melhorLag = b.lag; }
    }
    if (b.lag > L) {
      if (b.melhorLag >= 0 && b.melhor > 0) {
        // folga de 2 ms antes do pico: absorve o erro da decimacao
        // folga de ~5 ms antes do pico: absorve erro da decimacao e a cauda do filtro
        this.atraso = Math.max(0, b.melhorLag * DEC - 256);
        this.travado = true;
        this.w.fill(0);
        this.recalcularEnergia();
        this.desdeTravar = 0;
        this.port.postMessage({ atrasoMs: +(this.atraso / sampleRate * 1000).toFixed(1) });
      }
      this.busca = null;
    }
  }

  /** Estagio 2: calcula o ganho por faixa e soma o quadro tratado na saida. */
  processarQuadro(canais) {
    // espectro da referencia (o que estamos tocando)
    for (let i = 0; i < NFFT; i++) { this.reR[i] = this.entradaRef[i] * this.janela[i]; this.imR[i] = 0; }
    this.fft.run(this.reR, this.imR, false);

    // espectro da estimativa de eco do estagio 1
    for (let i = 0; i < NFFT; i++) { this.reY[i] = this.entradaEco[i] * this.janela[i]; this.imY[i] = 0; }
    this.fft.run(this.reY, this.imY, false);

    // espectro do residuo (canal 0) - e nele que medimos a coerencia
    for (let i = 0; i < NFFT; i++) { this.re[i] = this.entradaCh[0][i] * this.janela[i]; this.im[i] = 0; }
    this.fft.run(this.re, this.im, false);

    for (let k = 0; k < BINS; k++) {
      const xr = this.reR[k], xi = this.imR[k];
      const er = this.re[k], ei = this.im[k];
      this.pxx[k] = SUAVE * this.pxx[k] + (1 - SUAVE) * (xr * xr + xi * xi);
      this.pee[k] = SUAVE * this.pee[k] + (1 - SUAVE) * (er * er + ei * ei);
      this.pxeRe[k] = SUAVE * this.pxeRe[k] + (1 - SUAVE) * (xr * er + xi * ei);
      this.pxeIm[k] = SUAVE * this.pxeIm[k] + (1 - SUAVE) * (xi * er - xr * ei);

      const num = this.pxeRe[k] * this.pxeRe[k] + this.pxeIm[k] * this.pxeIm[k];
      const den = this.pxx[k] * this.pee[k] + 1e-12;
      // coerencia 1 = so eco nessa faixa; 0 = som do jogo, nao mexe
      const coerencia = Math.min(1, num / den);
      // (1 - coerencia) em vez da raiz: corta bem mais onde e claramente eco
      // Segunda medida, independente da coerencia: o estagio 1 estimou |Y| de eco
      // nesta faixa. O que escapa dele e uma fracao disso (RESIDUO). Se essa sobra for
      // comparavel ao que temos agora, abaixa. Isso resolve o caso do jogo alto tocando
      // junto com a voz, em que a coerencia sozinha fica conservadora demais.
      const yr = this.reY[k], yi = this.imY[k];
      this.pyy[k] = SUAVE * this.pyy[k] + (1 - SUAVE) * (yr * yr + yi * yi);
      const sobra = RESIDUO * Math.sqrt(this.pyy[k]);
      const atual = Math.sqrt(this.pee[k]) + 1e-9;
      const porEco = Math.max(0, 1 - sobra / atual);

      const alvo = Math.max(GANHO_MIN, Math.min(1 - coerencia, porEco));
      // sobe rapido (nao engolir o jogo) e desce devagar (nao deixar o eco vazar)
      this.ganho[k] = alvo > this.ganho[k]
        ? 0.5 * this.ganho[k] + 0.5 * alvo
        : 0.8 * this.ganho[k] + 0.2 * alvo;
    }

    for (let ch = 0; ch < canais; ch++) {
      for (let i = 0; i < NFFT; i++) { this.re[i] = this.entradaCh[ch][i] * this.janela[i]; this.im[i] = 0; }
      this.fft.run(this.re, this.im, false);
      for (let k = 0; k < BINS; k++) {
        const g = this.ganho[k];
        this.re[k] *= g; this.im[k] *= g;
        if (k > 0 && k < NFFT / 2) { this.re[NFFT - k] *= g; this.im[NFFT - k] *= g; }
      }
      this.fft.run(this.re, this.im, true);
      const saida = this.saidaCh[ch];
      for (let i = 0; i < NFFT; i++) saida[i] += this.re[i] * this.janela[i];
    }
  }

  process(entradas, saidas) {
    const mic = entradas[0];
    const refIn = entradas[1];
    const out = saidas[0];
    if (!mic || !mic.length || !out.length) return true;

    const canais = Math.min(mic.length, out.length);
    const quadros = mic[0].length;
    const refA = refIn && refIn[0] ? refIn[0] : null;
    const refB = refIn && refIn[1] ? refIn[1] : refA;

    for (let i = 0; i < quadros; i++) {
      const r = refA ? (refB ? (refA[i] + refB[i]) * 0.5 : refA[i]) : 0;
      this.ref[this.escrita] = r;

      let entradaSoma = 0;
      for (let ch = 0; ch < canais; ch++) entradaSoma += mic[ch][i] * mic[ch][i];

      // decimacao (media simples) para a busca de atraso
      this.accRef += r;
      this.accMic += canais > 1 ? (mic[0][i] + mic[1][i]) * 0.5 : mic[0][i];
      if (++this.accN >= DEC) {
        this.decRef[this.decPos] = this.accRef / DEC;
        this.decMic[this.decPos] = this.accMic / DEC;
        this.decPos = (this.decPos + 1) % DEC_RING;
        if (this.decCheio < DEC_RING) this.decCheio++;
        this.accRef = 0; this.accMic = 0; this.accN = 0;
      }

      if (this.ligado && this.travado) {
        const ref = this.ref;
        const w = this.w;
        const base = (this.escrita - this.atraso) & MASK;

        // energia da janela mantida por diferenca (entra uma amostra, sai outra)
        const entrou = ref[base];
        const saiu = ref[(base - TAPS) & MASK];
        this.energiaJanela += entrou * entrou - saiu * saiu;
        if (this.energiaJanela < 0) this.energiaJanela = 0;

        let y = 0;
        for (let k = 0; k < TAPS; k++) y += w[k] * ref[(base - k) & MASK];

        // adapta pelo downmix: o eco e igual nos dois canais, e assim o audio
        // do jogo (que e estereo) atrapalha menos a adaptacao
        const micMono = canais > 1 ? (mic[0][i] + mic[1][i]) * 0.5 : mic[0][i];
        const erro = micMono - y;
        // regularizacao: sem ela, um trecho de silencio na referencia faz o passo
        // explodir e o filtro diverge (vira NaN)
        // So adapta quando ha som nosso tocando. No silencio entre as falas o
        // filtro estaria perseguindo o audio do jogo e se desmancharia.
        if (this.energiaJanela / TAPS > PISO_REF) {
          const passo = (MU * erro) / (this.energiaJanela + 0.05);
          for (let k = 0; k < TAPS; k++) w[k] += passo * ref[(base - k) & MASK];
        }

        if (!(y === y) || !(erro === erro)) { this.reiniciar(); continue; }

        // ---- estagio 2: junta o quadro e devolve o trecho ja tratado ----
        // O sinal novo entra na segunda metade da janela; a primeira metade e o
        // pedaco anterior (soma-e-sobrepoe de 50%).
        const p = this.preencher;
        for (let ch = 0; ch < canais; ch++) this.entradaCh[ch][HOP + p] = mic[ch][i] - y;
        this.entradaRef[HOP + p] = ref[base];
        this.entradaEco[HOP + p] = y;

        let saidaSoma = 0;
        for (let ch = 0; ch < canais; ch++) {
          const v = this.prontos ? this.pronto[ch][p] : 0;
          out[ch][i] = v;
          saidaSoma += v * v;
        }
        this.energiaSaida += saidaSoma;

        if (++this.preencher >= HOP) {
          this.preencher = 0;
          this.processarQuadro(canais);          // soma o quadro novo no acumulador
          for (let ch = 0; ch < canais; ch++) {
            this.pronto[ch].set(this.saidaCh[ch].subarray(0, HOP));  // fica pronto p/ sair
            this.saidaCh[ch].copyWithin(0, HOP);
            this.saidaCh[ch].fill(0, HOP);
            this.entradaCh[ch].copyWithin(0, HOP);
          }
          this.entradaRef.copyWithin(0, HOP);
          this.entradaEco.copyWithin(0, HOP);
          if (this.prontos < 2) this.prontos++;
        }
        this.energiaEntrada += entradaSoma;
        this.amostrasMedidas++;
        this.desdeTravar++;
        // refaz a conta de tempos em tempos: a atualizacao por diferenca acumula erro
        if (++this.desdeRecalculo >= 24000) this.recalcularEnergia();
      } else {
        for (let ch = 0; ch < canais; ch++) out[ch][i] = mic[ch][i];
      }

      this.escrita = (this.escrita + 1) & MASK;
    }

    // busca de atraso: comeca quando nao esta travado, continua fatiada
    if (!this.travado && this.ligado) {
      if (this.busca) this.continuarBusca();
      else this.iniciarBusca();
    }

    // a cada ~2 s, avalia se esta valendo a pena
    if (this.amostrasMedidas > sampleRate * 2) {
      const erle = 10 * Math.log10((this.energiaEntrada + 1e-9) / (this.energiaSaida + 1e-9));
      this.port.postMessage({ erle: +erle.toFixed(1) });
      // piorou o sinal ou nao esta cancelando nada: procura o atraso de novo
      if (erle < -0.5) this.reiniciar();
      this.energiaEntrada = 0;
      this.energiaSaida = 0;
      this.amostrasMedidas = 0;
    }
    return true;
  }
}

registerProcessor('cancelador-eco', CanceladorEco);
