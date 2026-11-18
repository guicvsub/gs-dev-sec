// Roteiro simulado de um vídeo de rua, no formato das predições do Roboflow
// (x, y = centro da caixa; width, height em pixels de um quadro 960x540).
// Serve só para demonstrar a interface sem back-end.

export const LARGURA_QUADRO = 960
export const ALTURA_QUADRO = 540
export const INTERVALO_ANALISE = 0.5 // segundos, igual ao main.py

const CAIXAS = {
  faixa: { x: 480, y: 440, width: 814, height: 92 },
  semaforo: { x: 840, y: 175, width: 58, height: 118 },
  semaforoLonge: { x: 330, y: 173, width: 28, height: 50 },
  carroPerto: { x: 535, y: 305, width: 136, height: 74 },
  carroLonge: { x: 455, y: 238, width: 54, height: 30 },
}

const d = (classe, confianca, caixa) => ({ classe, confianca, ...CAIXAS[caixa] })

export const CENAS = [
  {
    inicio: 0,
    fim: 4,
    rua: { faixa: false, semaforo: null, semaforoLonge: null, carros: ['longe'] },
    deteccoes: [d('vehicle', 0.44, 'carroLonge')],
  },
  {
    inicio: 4,
    fim: 10,
    rua: { faixa: true, semaforo: 'vermelho', semaforoLonge: null, carros: ['perto'] },
    deteccoes: [
      d('pedestrian_crossing', 0.91, 'faixa'),
      d('red_light', 0.87, 'semaforo'),
      d('vehicle', 0.78, 'carroPerto'),
    ],
  },
  {
    inicio: 10,
    fim: 16,
    rua: { faixa: true, semaforo: 'verde', semaforoLonge: null, carros: [] },
    deteccoes: [d('pedestrian_crossing', 0.93, 'faixa'), d('green_light', 0.89, 'semaforo')],
  },
  {
    inicio: 16,
    fim: 21,
    rua: { faixa: false, semaforo: 'verde', semaforoLonge: null, carros: ['longe'] },
    deteccoes: [d('green_light', 0.76, 'semaforo'), d('vehicle', 0.52, 'carroLonge')],
  },
  {
    inicio: 21,
    fim: 26,
    rua: { faixa: true, semaforo: null, semaforoLonge: null, carros: ['longe'] },
    deteccoes: [d('pedestrian_crossing', 0.84, 'faixa'), d('vehicle', 0.61, 'carroLonge')],
  },
  {
    inicio: 26,
    fim: 31,
    rua: { faixa: false, semaforo: 'vermelho', semaforoLonge: null, carros: ['perto'] },
    deteccoes: [d('red_light', 0.71, 'semaforo'), d('vehicle', 0.66, 'carroPerto')],
  },
  {
    // Dois semáforos com cores diferentes: vale o de maior confiança
    inicio: 31,
    fim: 37,
    rua: { faixa: true, semaforo: 'verde', semaforoLonge: 'vermelho', carros: [] },
    deteccoes: [
      d('pedestrian_crossing', 0.88, 'faixa'),
      d('green_light', 0.81, 'semaforo'),
      d('red_light', 0.58, 'semaforoLonge'),
    ],
  },
  {
    inicio: 37,
    fim: 42,
    rua: { faixa: false, semaforo: null, semaforoLonge: null, carros: [] },
    deteccoes: [],
  },
]

export const DURACAO = CENAS[CENAS.length - 1].fim

export function cenaNoTempo(t) {
  return CENAS.find((c) => t >= c.inicio && t < c.fim) ?? CENAS[CENAS.length - 1]
}

// Pequena variação determinística por análise, para parecer leitura ao vivo
function ruido(semente) {
  const s = Math.sin(semente * 12.9898) * 43758.5453
  return s - Math.floor(s) - 0.5
}

export function deteccoesNoTempo(t) {
  const cena = cenaNoTempo(t)
  return cena.deteccoes.map((det, i) => {
    const n = ruido(t * 7 + i * 3.1)
    return {
      ...det,
      id: `${det.classe}-${i}`,
      confianca: Math.min(0.99, Math.max(0.05, det.confianca + n * 0.06)),
      x: det.x + n * 6,
      y: det.y + ruido(t * 5 + i) * 4,
    }
  })
}
