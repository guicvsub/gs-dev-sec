import { NOMES_CLASSES, corDaClasse } from '../lib/regras'

const BARRA = { verde: 'bg-siga', vermelho: 'bg-pare', outra: 'bg-tatil' }

export default function ListaDeteccoes({ deteccoes, limiar }) {
  const ordenadas = [...deteccoes].sort((a, b) => b.confianca - a.confianca)

  return (
    <section aria-labelledby="titulo-deteccoes" className="rounded-2xl bg-faixa p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="titulo-deteccoes" className="font-sinal text-xl font-extrabold">
          O que o modelo viu
        </h2>
        <span className="text-sm text-guia">
          {ordenadas.filter((d) => d.confianca >= limiar).length} de {ordenadas.length} acima do limite
        </span>
      </div>

      {ordenadas.length === 0 ? (
        <p className="mt-4 rounded-xl border-2 border-dashed border-concreto-escuro p-4 text-guia">
          Nenhum objeto neste quadro. O aviso volta a mudar quando a câmera encontrar uma faixa ou um semáforo.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {ordenadas.map((d) => {
            const valida = d.confianca >= limiar
            const pct = Math.round(d.confianca * 100)
            return (
              <li key={d.id} className={valida ? '' : 'text-guia'}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold">{NOMES_CLASSES[d.classe] ?? d.classe}</span>
                  <span className="tabular-nums">
                    {pct}%{!valida && <span className="ml-2 text-sm">ignorado</span>}
                  </span>
                </div>
                <div className="relative mt-1.5 h-3 rounded-full bg-concreto" aria-hidden="true">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${valida ? BARRA[corDaClasse(d.classe) ?? 'outra'] : 'bg-concreto-escuro'}`}
                    style={{ width: `${pct}%` }}
                  />
                  <div
                    className="absolute -top-1 -bottom-1 w-0.5 bg-asfalto"
                    style={{ left: `${limiar * 100}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-4 text-sm text-guia">
        A linha preta marca o limite de confiança. Abaixo dela, a detecção não entra no aviso.
      </p>
    </section>
  )
}
