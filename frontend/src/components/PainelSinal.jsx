import { ESTADOS, MENSAGENS } from '../lib/regras'
import { Mao, Olho, Pedestre, Zebra } from './Pictogramas'

const TONS = {
  siga: { lente: 'bg-siga text-white', icone: Pedestre },
  pare: { lente: 'bg-pare text-white', icone: Mao },
  alerta: { lente: 'bg-tatil text-asfalto piso-tatil', icone: Zebra },
  neutro: { lente: 'bg-asfalto-claro text-faixa', icone: Olho },
}

export default function PainelSinal({ chave, tocando, aoRepetir }) {
  const estado = ESTADOS[chave]
  const tom = TONS[estado.tom]
  const Icone = tom.icone
  const semFaixa = chave === 'semaforo_verde' || chave === 'semaforo_vermelho'

  return (
    <section aria-labelledby="titulo-aviso" className="rounded-[2rem] bg-asfalto p-3 shadow-[0_18px_40px_-20px_rgb(42_46_53/0.7)] sm:p-4">
      <div className="flex items-center justify-between px-2 pb-3 text-sm text-concreto-escuro">
        <span className="flex items-center gap-2">
          <span
            className={`size-2.5 rounded-full ${tocando ? 'bg-siga pulsar' : 'bg-guia'}`}
            aria-hidden="true"
          />
          {tocando ? 'Analisando a cada 0,5 s' : 'Análise pausada'}
        </span>
        <span>Aviso atual</span>
      </div>

      <div key={chave} className={`acender relative overflow-hidden rounded-[1.4rem] ${tom.lente}`}>
        <div className="flex min-h-[15rem] flex-col justify-between gap-6 p-5 sm:min-h-[19rem] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <Icone className="size-20 shrink-0 sm:size-28" />
            {semFaixa && (
              <span className="rounded-full border-2 border-current px-3 py-1 text-sm font-bold">
                Sem faixa
              </span>
            )}
          </div>
          <div aria-live="polite" aria-atomic="true">
            <h2
              id="titulo-aviso"
              className="font-sinal text-[2.35rem] leading-[1.02] font-black tracking-[-0.01em] text-balance sm:text-5xl lg:text-[3.4rem]"
            >
              {estado.titulo}
            </h2>
            <p className="mt-3 max-w-[34ch] text-base leading-snug opacity-90 sm:text-lg">
              {chave === 'nada' ? 'Nenhuma faixa ou semáforo com confiança suficiente.' : MENSAGENS[chave]}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-3">
        <p className="text-sm leading-snug text-concreto-escuro">
          Apoio à orientação. Não substitui bengala, cão-guia ou a sua atenção ao trânsito.
        </p>
        <button
          type="button"
          onClick={aoRepetir}
          className="rounded-full bg-faixa px-4 py-2 text-sm font-bold text-asfalto hover:bg-white"
        >
          Repetir aviso
        </button>
      </div>
    </section>
  )
}
