import { LARGURA_QUADRO as W, ALTURA_QUADRO as H } from '../data/cenas'
import { Caixa, Carimbo } from './CaixasDeteccao'

const HORIZONTE = 210
// borda esquerda da pista em perspectiva, para uma altura y
const bordaEsq = (y) => 400 - (400 * (y - HORIZONTE)) / (H - HORIZONTE)
const bordaDir = (y) => W - bordaEsq(y)

function Predios() {
  const blocos = [
    [0, 70, 120], [110, 40, 90], [190, 95, 150], [330, 120, 80], [400, 60, 60],
    [560, 85, 70], [620, 30, 130], [740, 100, 90], [820, 55, 140],
  ]
  return (
    <g>
      {blocos.map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={HORIZONTE - y} fill={i % 2 ? '#B9C0C7' : '#A9B1B9'} />
          {Array.from({ length: Math.floor((HORIZONTE - y - 20) / 26) }).map((_, r) =>
            Array.from({ length: Math.floor((w - 12) / 22) }).map((_, c) => (
              <rect key={`${r}-${c}`} x={x + 10 + c * 22} y={y + 14 + r * 26} width="10" height="12" fill="#8D96A0" opacity="0.55" />
            )),
          )}
        </g>
      ))}
    </g>
  )
}

function Faixa() {
  const topo = 400
  const base = 480
  const n = 11
  const faixas = []
  for (let i = 0; i < n; i++) {
    const f0 = i / n + 0.08 / n
    const f1 = (i + 0.62) / n
    const pt = (y, f) => bordaEsq(y) + (bordaDir(y) - bordaEsq(y)) * f
    faixas.push(
      <polygon
        key={i}
        points={`${pt(topo, f0)},${topo} ${pt(topo, f1)},${topo} ${pt(base, f1)},${base} ${pt(base, f0)},${base}`}
        fill="#F2F3EE"
      />,
    )
  }
  return <g>{faixas}</g>
}

function LinhaCentral({ faixa }) {
  const trechos = [[214, 224], [236, 252], [270, 296], [322, 362], [500, 540]]
  if (!faixa) trechos.push([392, 470])
  return (
    <g fill="#E8C547">
      {trechos.map(([a, b]) => {
        const wa = 1.5 + (a - HORIZONTE) * 0.022
        const wb = 1.5 + (b - HORIZONTE) * 0.022
        return <polygon key={a} points={`${480 - wa},${a} ${480 + wa},${a} ${480 + wb},${b} ${480 - wb},${b}`} />
      })}
    </g>
  )
}

function Semaforo({ x, topo, escala = 1, cor }) {
  const w = 52 * escala
  const h = 112 * escala
  const hx = x - w / 2
  const hy = topo
  return (
    <g>
      <rect x={x - 4 * escala} y={hy + h - 4} width={8 * escala} height={400 - hy - h + 10} fill="#4A515B" />
      <rect x={hx} y={hy} width={w} height={h} rx={6 * escala} fill="#1E2227" />
      {/* lâmpada de cima: mão vermelha */}
      <circle cx={x} cy={hy + h * 0.28} r={18 * escala} fill={cor === 'vermelho' ? '#FF3B4E' : '#3A1C21'} />
      {cor === 'vermelho' && <circle cx={x} cy={hy + h * 0.28} r={30 * escala} fill="#FF3B4E" opacity="0.25" />}
      {/* lâmpada de baixo: pedestre verde */}
      <circle cx={x} cy={hy + h * 0.72} r={18 * escala} fill={cor === 'verde' ? '#2BE38A' : '#163326'} />
      {cor === 'verde' && <circle cx={x} cy={hy + h * 0.72} r={30 * escala} fill="#2BE38A" opacity="0.25" />}
    </g>
  )
}

function Carro({ cx, cy, w, h }) {
  const x = cx - w / 2
  const y = cy - h / 2
  return (
    <g>
      <ellipse cx={cx} cy={y + h + 2} rx={w * 0.55} ry={h * 0.08} fill="#000" opacity="0.25" />
      <rect x={x + w * 0.14} y={y} width={w * 0.72} height={h * 0.45} rx={h * 0.12} fill="#3F6E9E" />
      <rect x={x + w * 0.2} y={y + h * 0.07} width={w * 0.6} height={h * 0.3} rx={h * 0.06} fill="#B8D3EA" opacity="0.8" />
      <rect x={x} y={y + h * 0.36} width={w} height={h * 0.5} rx={h * 0.12} fill="#4E80B3" />
      <rect x={x + w * 0.05} y={y + h * 0.48} width={w * 0.16} height={h * 0.12} rx="2" fill="#E83A3A" />
      <rect x={x + w * 0.79} y={y + h * 0.48} width={w * 0.16} height={h * 0.12} rx="2" fill="#E83A3A" />
      <rect x={x + w * 0.36} y={y + h * 0.62} width={w * 0.28} height={h * 0.12} rx="2" fill="#F2F3EE" />
      <rect x={x + w * 0.06} y={y + h * 0.84} width={w * 0.14} height={h * 0.16} rx="2" fill="#1E2227" />
      <rect x={x + w * 0.8} y={y + h * 0.84} width={w * 0.14} height={h * 0.16} rx="2" fill="#1E2227" />
    </g>
  )
}

export default function CenaRua({ rua, deteccoes, limiar, tempo }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-full w-full"
      role="img"
      aria-label="Quadro simulado da câmera com as detecções desenhadas"
    >
      <defs>
        <linearGradient id="ceu" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#CBD6DF" />
          <stop offset="1" stopColor="#E7ECEF" />
        </linearGradient>
        <pattern id="tatil" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="#F2B705" />
          <circle cx="4.5" cy="4.5" r="2" fill="#C99600" />
        </pattern>
      </defs>

      <rect width={W} height={HORIZONTE} fill="url(#ceu)" />
      <Predios />

      {/* calçadas */}
      <polygon points={`0,${HORIZONTE} 400,${HORIZONTE} 0,${H}`} fill="#BFC4C9" />
      <polygon points={`${W},${HORIZONTE} 560,${HORIZONTE} ${W},${H}`} fill="#BFC4C9" />
      {/* meio-fio */}
      <polygon points={`400,${HORIZONTE} 404,${HORIZONTE} 10,${H} 0,${H}`} fill="#8E959D" />
      <polygon points={`560,${HORIZONTE} 556,${HORIZONTE} ${W - 10},${H} ${W},${H}`} fill="#8E959D" />

      {/* pista */}
      <polygon points={`404,${HORIZONTE} 556,${HORIZONTE} ${W - 10},${H} 10,${H}`} fill="#454B53" />

      {rua.faixa && (
        <>
          <Faixa />
          {/* piso tátil de alerta na calçada, antes da faixa */}
          <polygon points="60,402 150,402 120,482 20,482" fill="url(#tatil)" />
          <polygon points={`${W - 60},402 ${W - 150},402 ${W - 120},482 ${W - 20},482`} fill="url(#tatil)" />
        </>
      )}
      <LinhaCentral faixa={rua.faixa} />

      {rua.carros.includes('longe') && <Carro cx={455} cy={238} w={52} h={28} />}
      {rua.carros.includes('perto') && <Carro cx={535} cy={305} w={132} h={70} />}

      {rua.semaforoLonge && <Semaforo x={330} topo={148} escala={0.45} cor={rua.semaforoLonge} />}
      {rua.semaforo && <Semaforo x={840} topo={116} cor={rua.semaforo} />}

      {deteccoes.map((d) => (
        <Caixa key={d.id} det={d} valida={d.confianca >= limiar} largura={W} />
      ))}

      <Carimbo tempo={tempo} />
    </svg>
  )
}
