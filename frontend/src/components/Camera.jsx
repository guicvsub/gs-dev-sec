import { ESTADOS, carimbo } from '../lib/regras'

const COR_TRECHO = { siga: 'bg-siga', pare: 'bg-pare', alerta: 'bg-tatil', neutro: 'bg-guia' }

const MODOS = [
  { id: 'video', rotulo: 'Vídeo real' },
  { id: 'simulado', rotulo: 'Rua simulada' },
]

export default function Camera({
  modo,
  aoTrocarModo,
  children,
  segmentos,
  tempo,
  duracao,
  tocando,
  pronto,
  aoTocar,
  aoReiniciar,
  aoBuscar,
  rodape,
}) {
  return (
    <section aria-labelledby="titulo-camera" className="overflow-hidden rounded-2xl bg-asfalto text-faixa">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <h2 id="titulo-camera" className="font-sinal text-lg font-extrabold">
          Câmera
        </h2>
        <div role="radiogroup" aria-label="Fonte da imagem" className="flex rounded-full bg-asfalto-claro p-1">
          {MODOS.map((m) => {
            const ativo = modo === m.id
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => aoTrocarModo(m.id)}
                className={`rounded-full px-3.5 py-1 text-sm font-bold transition-colors ${ativo ? 'bg-tatil text-asfalto' : 'text-concreto hover:text-white'}`}
              >
                {m.rotulo}
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative aspect-video bg-black">{children}</div>

      <div className="space-y-3 px-4 py-4 sm:px-5">
        {/* linha do tempo: cada trecho pintado com o aviso que ele gera */}
        <div className="flex h-2.5 gap-px overflow-hidden rounded-full bg-asfalto-claro" aria-hidden="true">
          {segmentos.map((s, i) => (
            <div key={i} className={`${COR_TRECHO[ESTADOS[s.chave].tom]} opacity-85`} style={{ flexGrow: s.peso }} />
          ))}
        </div>
        <input
          type="range"
          min="0"
          max={duracao || 1}
          step="0.5"
          value={Math.min(tempo, duracao || 1)}
          disabled={!pronto}
          onChange={(e) => aoBuscar(Number(e.target.value))}
          className="w-full [accent-color:var(--color-tatil)] disabled:opacity-40"
          aria-label="Posição no vídeo"
          aria-valuetext={`${carimbo(tempo)} de ${carimbo(duracao)}`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={aoTocar}
            disabled={!pronto}
            className="min-w-32 rounded-full bg-tatil px-6 py-3 font-sinal text-lg font-extrabold text-asfalto hover:brightness-105 disabled:opacity-50"
          >
            {!pronto ? 'Carregando…' : tocando ? 'Pausar' : tempo > 0 ? 'Continuar' : 'Iniciar'}
          </button>
          <button
            type="button"
            onClick={aoReiniciar}
            disabled={!pronto}
            className="rounded-full border-2 border-guia px-5 py-2.5 font-bold hover:border-faixa disabled:opacity-50"
          >
            Recomeçar
          </button>
          <span className="ml-auto text-sm text-concreto-escuro tabular-nums">
            {carimbo(tempo)} / {carimbo(duracao)}
          </span>
        </div>
        {rodape && <p className="text-sm leading-snug text-concreto-escuro">{rodape}</p>}
      </div>
    </section>
  )
}
