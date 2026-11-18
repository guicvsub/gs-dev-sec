// Mesma regra de utility/classes.py, reescrita em JS só para a demonstração visual.
// O front não chama o back-end: as detecções vêm de data/cenas.js.

export const MENSAGENS = {
  faixa_verde: 'Faixa de pedestre e semáforo verde a frente',
  faixa_vermelho: 'Faixa de pedestre e semáforo vermelho a frente',
  faixa_sem_semaforo: 'Faixa de pedestre sem semáforo a frente',
  semaforo_verde: 'Semáforo verde a frente (sem faixa de pedestre)',
  semaforo_vermelho: 'Semáforo vermelho a frente (sem faixa de pedestre)',
  nada: '----------Nada relevante pode ser detectado----------',
}

// Como cada resultado aparece na tela e o que é falado em voz alta
export const ESTADOS = {
  faixa_verde: {
    titulo: 'Faixa com sinal verde',
    fala: 'Faixa de pedestre e semáforo verde à frente.',
    tom: 'siga',
    vibracao: [400],
  },
  faixa_vermelho: {
    titulo: 'Faixa com sinal vermelho',
    fala: 'Faixa de pedestre e semáforo vermelho à frente. Aguarde.',
    tom: 'pare',
    vibracao: [120, 80, 120, 80, 120],
  },
  faixa_sem_semaforo: {
    titulo: 'Faixa sem semáforo',
    fala: 'Faixa de pedestre sem semáforo à frente. Atenção aos veículos.',
    tom: 'alerta',
    vibracao: [200, 120, 200],
  },
  semaforo_verde: {
    titulo: 'Sinal verde, sem faixa',
    fala: 'Semáforo verde à frente, sem faixa de pedestre.',
    tom: 'siga',
    vibracao: [400],
  },
  semaforo_vermelho: {
    titulo: 'Sinal vermelho, sem faixa',
    fala: 'Semáforo vermelho à frente, sem faixa de pedestre.',
    tom: 'pare',
    vibracao: [120, 80, 120, 80, 120],
  },
  nada: {
    titulo: 'Nada relevante à frente',
    fala: 'Nada relevante detectado.',
    tom: 'neutro',
    vibracao: null,
  },
}

export function corDaClasse(classe) {
  const n = classe.toLowerCase()
  if (n.includes('green') || n.includes('verde')) return 'verde'
  if (n.includes('red') || n.includes('vermelho')) return 'vermelho'
  return null
}

export function ehFaixa(classe) {
  const n = classe.toLowerCase()
  return n.includes('crossing') || n.includes('crosswalk') || n.includes('faixa')
}

// Recebe as detecções já filtradas pelo limiar de confiança
export function escolherMensagem(deteccoes) {
  const temFaixa = deteccoes.some((d) => ehFaixa(d.classe))
  const semaforos = deteccoes.filter((d) => corDaClasse(d.classe))
  const cor = semaforos.length
    ? corDaClasse(semaforos.reduce((a, b) => (b.confianca > a.confianca ? b : a)).classe)
    : null

  if (temFaixa) {
    if (cor === 'verde') return 'faixa_verde'
    if (cor === 'vermelho') return 'faixa_vermelho'
    return 'faixa_sem_semaforo'
  }
  if (cor === 'verde') return 'semaforo_verde'
  if (cor === 'vermelho') return 'semaforo_vermelho'
  return 'nada'
}

export const NOMES_CLASSES = {
  pedestrian_crossing: 'Faixa de pedestre',
  green_light: 'Semáforo verde',
  red_light: 'Semáforo vermelho',
  vehicle: 'Veículo',
}

export function carimbo(segundos) {
  const s = Math.floor(segundos)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
