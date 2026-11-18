import { NOMES_CLASSES, carimbo, corDaClasse } from '../lib/regras'

const CORES_CAIXA = { verde: '#14A363', vermelho: '#D7263D', outra: '#FFC72C' }

// Desenha as caixas como o draw_box do Python: retângulo + rótulo "classe NN%"
export function Caixa({ det, valida, largura, escala = 1 }) {
  const corSem = corDaClasse(det.classe)
  const cor = CORES_CAIXA[corSem ?? 'outra']
  const x = det.x - det.width / 2
  const y = det.y - det.height / 2
  const rotulo = `${NOMES_CLASSES[det.classe] ?? det.classe} ${Math.round(det.confianca * 100)}%`
  const fonte = 17 * escala
  const alturaRotulo = 28 * escala
  const larguraRotulo = rotulo.length * fonte * 0.565 + 14 * escala
  const ry = Math.max(0, y - alturaRotulo - 2)
  // rótulo encostado na borda direita da caixa quando não cabe no quadro
  const rx = x + larguraRotulo > largura ? Math.max(0, x + det.width - larguraRotulo) : Math.max(0, x)
  return (
    <g opacity={valida ? 1 : 0.55}>
      <rect
        x={x}
        y={y}
        width={det.width}
        height={det.height}
        fill="none"
        stroke={cor}
        strokeWidth={(valida ? 4 : 2.5) * escala}
        strokeDasharray={valida ? undefined : `${10 * escala} ${8 * escala}`}
      />
      <rect x={rx} y={ry} width={larguraRotulo} height={alturaRotulo} fill={valida ? cor : '#2A2E35'} />
      <text
        x={rx + 7 * escala}
        y={ry + alturaRotulo * 0.72}
        fontFamily="Atkinson Hyperlegible, sans-serif"
        fontWeight="700"
        fontSize={fonte}
        fill={valida ? (corSem ? '#fff' : '#2A2E35') : '#F7F8F5'}
      >
        {rotulo}
      </text>
    </g>
  )
}

export function Carimbo({ tempo, escala = 1 }) {
  return (
    <text
      x={16 * escala}
      y={38 * escala}
      fontFamily="Overpass, sans-serif"
      fontWeight="800"
      fontSize={26 * escala}
      fill="#fff"
      stroke="#1E2227"
      strokeWidth={5 * escala}
      paintOrder="stroke"
    >
      Vídeo {carimbo(tempo)}
    </text>
  )
}

// Camada transparente sobre o vídeo do YouTube
export default function CaixasDeteccao({ largura, altura, deteccoes, limiar, tempo }) {
  const escala = largura / 960
  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {deteccoes.map((d) => (
        <Caixa key={d.id} det={d} valida={d.confianca >= limiar} largura={largura} escala={escala} />
      ))}
      <Carimbo tempo={tempo} escala={escala} />
    </svg>
  )
}
