import { ESTADOS, MENSAGENS } from '../lib/regras'

const ETAPAS = [
  {
    titulo: 'A câmera filma a rua',
    texto: 'O vídeo chega quadro a quadro. Hoje a fonte é um vídeo público do YouTube; no produto, a câmera vestível ESP32-CAM.',
  },
  {
    titulo: 'O modelo procura quatro coisas',
    texto: 'A cada meio segundo um quadro vai para o modelo no Roboflow, que marca faixa de pedestre, semáforo verde, semáforo vermelho e veículos.',
  },
  {
    titulo: 'A regra escolhe um aviso',
    texto: 'Detecções abaixo de 50% de confiança são descartadas. Se aparecerem semáforo verde e vermelho juntos, vale o de maior confiança.',
  },
  {
    titulo: 'A pessoa recebe o aviso',
    texto: 'O aviso é falado e vibra no celular, sem precisar olhar para a tela.',
  },
]

const COR = { siga: 'bg-siga', pare: 'bg-pare', alerta: 'bg-tatil', neutro: 'bg-guia' }
const ORDEM = ['faixa_verde', 'faixa_vermelho', 'faixa_sem_semaforo', 'semaforo_verde', 'semaforo_vermelho', 'nada']

export default function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-como" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <h2 id="titulo-como" className="font-sinal text-3xl leading-tight font-black sm:text-4xl">
            Como o aviso é decidido
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg leading-relaxed">
            Quem é cego ou tem baixa visão não consegue saber, de longe, se há faixa e qual é a cor do
            sinal. O assistente olha por essa pessoa e resume a travessia em uma frase.
          </p>

          <ol className="mt-8 space-y-0">
            {ETAPAS.map((e, i) => (
              <li key={e.titulo} className="relative flex gap-4 pb-7 last:pb-0">
                {i < ETAPAS.length - 1 && (
                  <span className="absolute top-10 bottom-0 left-[1.15rem] w-1 piso-direcional bg-tatil/60" aria-hidden="true" />
                )}
                <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-asfalto font-sinal text-lg font-black text-tatil">
                  {i + 1}
                </span>
                <div className="pt-1.5">
                  <h3 className="font-bold text-lg leading-snug">{e.titulo}</h3>
                  <p className="mt-1 max-w-[52ch] leading-relaxed text-asfalto/80">{e.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="font-sinal text-2xl font-extrabold">Os seis avisos possíveis</h3>
          <p className="mt-2 text-asfalto/80">Texto exato que o sistema imprime em cada situação.</p>
          <div className="mt-5 overflow-hidden rounded-2xl bg-faixa">
            <table className="w-full text-left">
              <thead className="bg-asfalto text-faixa">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Situação</th>
                  <th scope="col" className="hidden px-4 py-3 font-bold sm:table-cell">Mensagem do sistema</th>
                </tr>
              </thead>
              <tbody>
                {ORDEM.map((k) => (
                  <tr key={k} className="border-t border-concreto align-top">
                    <th scope="row" className="px-4 py-3.5 font-bold">
                      <span className="flex items-center gap-3">
                        <span className={`size-3.5 shrink-0 rounded-full ${COR[ESTADOS[k].tom]}`} aria-hidden="true" />
                        {ESTADOS[k].titulo}
                      </span>
                      <span className="mt-1 block pl-6.5 text-sm font-normal text-guia sm:hidden">{MENSAGENS[k]}</span>
                    </th>
                    <td className="hidden px-4 py-3.5 text-guia sm:table-cell">{MENSAGENS[k]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-2xl border-2 border-asfalto p-5">
            <h3 className="font-bold text-lg">Limites conhecidos</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
              <li>À noite, com chuva ou com o sinal muito longe, o modelo erra mais.</li>
              <li>O aviso é um apoio: a decisão de atravessar continua sendo da pessoa.</li>
              <li>Os números desta página vêm de uma simulação, não de testes com usuários.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
