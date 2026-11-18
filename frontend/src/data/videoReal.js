// Detecções reais do modelo no vídeo padrão do main.py, geradas uma vez com o Roboflow
// e salvas em public/dados/deteccoes-video.json. O site só lê o arquivo.

import { escolherMensagem } from '../lib/regras'

export const VIDEO_PADRAO = {
  id: 'zIIIr0ZFQY4',
  url: 'https://www.youtube.com/watch?v=zIIIr0ZFQY4',
}

export async function carregarDeteccoesVideo() {
  const r = await fetch(`${import.meta.env.BASE_URL}dados/deteccoes-video.json`)
  if (!r.ok) throw new Error('Arquivo de detecções do vídeo não encontrado.')
  const dados = await r.json()
  dados.analises = dados.analises.filter((a) => a.p)
  return dados
}

// Índice da última análise feita até o tempo t (busca binária)
export function indiceNoTempo(analises, t) {
  let lo = 0
  let hi = analises.length - 1
  let res = -1
  while (lo <= hi) {
    const m = (lo + hi) >> 1
    if (analises[m].t <= t) {
      res = m
      lo = m + 1
    } else hi = m - 1
  }
  return res
}

export function deteccoesDaAnalise(analise) {
  if (!analise) return []
  return analise.p.map(([classe, confianca, x, y, width, height], i) => ({
    id: `${analise.t}-${i}`,
    classe,
    confianca,
    x,
    y,
    width,
    height,
  }))
}

// Resume o vídeo em trechos para pintar a linha do tempo
export function segmentosDoVideo(analises, limiar, duracao, trechos = 120) {
  if (!analises.length || !duracao) return []
  const tamanho = duracao / trechos
  const segs = []
  for (let i = 0; i < trechos; i++) {
    const ini = indiceNoTempo(analises, i * tamanho)
    const fim = indiceNoTempo(analises, (i + 1) * tamanho)
    const contagem = {}
    for (let k = Math.max(0, ini); k <= fim; k++) {
      const ch = escolherMensagem(deteccoesDaAnalise(analises[k]).filter((d) => d.confianca >= limiar))
      if (ch !== 'nada') contagem[ch] = (contagem[ch] ?? 0) + 1
    }
    const chave = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'nada'
    const anterior = segs[segs.length - 1]
    if (anterior?.chave === chave) anterior.peso += 1
    else segs.push({ chave, peso: 1 })
  }
  return segs
}
