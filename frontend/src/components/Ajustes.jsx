function Chave({ id, ligado, aoMudar, rotulo, dica, desativado }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className={desativado ? 'text-guia' : ''}>
        <span className="block font-bold">{rotulo}</span>
        <span className="block text-sm text-guia">{dica}</span>
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ligado}
        disabled={desativado}
        onClick={() => aoMudar(!ligado)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-40 ${ligado ? 'bg-asfalto' : 'bg-concreto-escuro'}`}
      >
        <span
          className={`absolute top-1 left-1 size-6 rounded-full bg-faixa shadow transition-transform ${ligado ? 'translate-x-6 bg-tatil' : ''}`}
        />
      </button>
    </div>
  )
}

export default function Ajustes({ limiar, setLimiar, voz, setVoz, vibrar, setVibrar, vozDisponivel, vibraDisponivel }) {
  return (
    <section aria-labelledby="titulo-ajustes" className="rounded-2xl bg-faixa p-5">
      <h2 id="titulo-ajustes" className="font-sinal text-xl font-extrabold">
        Ajustes
      </h2>

      <div className="mt-3 border-b border-concreto pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="limiar" className="font-bold">
            Confiança mínima
          </label>
          <span className="font-sinal text-xl font-extrabold tabular-nums">{Math.round(limiar * 100)}%</span>
        </div>
        <input
          id="limiar"
          type="range"
          min="0.3"
          max="0.9"
          step="0.05"
          value={limiar}
          onChange={(e) => setLimiar(Number(e.target.value))}
          className="mt-2 w-full"
        />
        <p className="text-sm text-guia">
          Mais alto evita avisos errados, mas pode deixar passar objetos distantes. O sistema usa 50%.
        </p>
      </div>

      <div className="divide-y divide-concreto">
        <Chave
          id="voz"
          ligado={voz && vozDisponivel}
          aoMudar={setVoz}
          desativado={!vozDisponivel}
          rotulo="Aviso por voz"
          dica={vozDisponivel ? 'Fala o aviso sempre que ele muda' : 'Este navegador não tem leitura em voz'}
        />
        <Chave
          id="vibrar"
          ligado={vibrar && vibraDisponivel}
          aoMudar={setVibrar}
          desativado={!vibraDisponivel}
          rotulo="Vibração"
          dica={vibraDisponivel ? 'Longa no verde, curtas no vermelho' : 'Disponível em celulares Android'}
        />
      </div>
    </section>
  )
}
