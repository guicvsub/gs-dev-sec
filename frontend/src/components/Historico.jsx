import { ESTADOS, carimbo } from '../lib/regras'

const PINO = {
  siga: 'bg-siga',
  pare: 'bg-pare',
  alerta: 'bg-tatil',
  neutro: 'bg-guia',
}

export default function Historico({ itens, analises }) {
  return (
    <section aria-labelledby="titulo-historico" className="rounded-2xl bg-faixa p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="titulo-historico" className="font-sinal text-xl font-extrabold">
          Avisos dados
        </h2>
        <span className="text-sm text-guia tabular-nums">{analises} análises</span>
      </div>

      {itens.length === 0 ? (
        <p className="mt-4 text-guia">Aperte “Iniciar” para começar. Cada mudança de aviso aparece aqui.</p>
      ) : (
        <ol className="mt-3 max-h-80 overflow-y-auto pr-1" aria-label="Avisos em ordem, do mais recente">
          {itens.map((item) => {
            const estado = ESTADOS[item.chave]
            return (
              <li key={item.id} className="flex items-center gap-3 border-b border-concreto py-2.5 last:border-0">
                <span className="w-12 shrink-0 text-sm text-guia tabular-nums">{carimbo(item.tempo)}</span>
                <span className={`size-3 shrink-0 rounded-full ${PINO[estado.tom]}`} aria-hidden="true" />
                <span className="font-bold leading-tight">{estado.titulo}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
