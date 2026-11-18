import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DURACAO as DURACAO_SIM, INTERVALO_ANALISE, CENAS, cenaNoTempo, deteccoesNoTempo } from './data/cenas'
import {
  VIDEO_PADRAO,
  carregarDeteccoesVideo,
  deteccoesDaAnalise,
  indiceNoTempo,
  segmentosDoVideo,
} from './data/videoReal'
import { ESTADOS, escolherMensagem } from './lib/regras'
import PainelSinal from './components/PainelSinal'
import Camera from './components/Camera'
import CenaRua from './components/CenaRua'
import CaixasDeteccao from './components/CaixasDeteccao'
import PlayerYouTube from './components/PlayerYouTube'
import ListaDeteccoes from './components/ListaDeteccoes'
import Historico from './components/Historico'
import Ajustes from './components/Ajustes'
import ComoFunciona from './components/ComoFunciona'

const NOME_PRODUTO = 'Travessia'

const vozDisponivel = typeof window !== 'undefined' && 'speechSynthesis' in window
const vibraDisponivel = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

function falar(texto) {
  if (!vozDisponivel) return
  const synth = window.speechSynthesis
  synth.cancel()
  const fala = new SpeechSynthesisUtterance(texto)
  fala.lang = 'pt-BR'
  const vozPt = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('pt'))
  if (vozPt) fala.voice = vozPt
  fala.rate = 1.05
  synth.speak(fala)
}

export default function App() {
  const [modo, setModo] = useState('video')
  const [tempo, setTempo] = useState(0)
  const [tocando, setTocando] = useState(false)
  const [limiar, setLimiar] = useState(0.5)
  const [voz, setVoz] = useState(true)
  const [vibrar, setVibrar] = useState(true)
  const [historico, setHistorico] = useState([])
  const [analises, setAnalises] = useState(0)
  const ultimoAviso = useRef(null)

  // vídeo real
  const player = useRef(null)
  const [dadosVideo, setDadosVideo] = useState(null)
  const [duracaoVideo, setDuracaoVideo] = useState(0)
  const [playerPronto, setPlayerPronto] = useState(false)
  const [erroVideo, setErroVideo] = useState(null)

  useEffect(() => {
    carregarDeteccoesVideo()
      .then(setDadosVideo)
      .catch((e) => setErroVideo(e.message))
  }, [])

  const emVideo = modo === 'video'
  const indice = emVideo && dadosVideo ? indiceNoTempo(dadosVideo.analises, tempo) : -1

  const deteccoes = useMemo(() => {
    if (!emVideo) return deteccoesNoTempo(tempo)
    return dadosVideo ? deteccoesDaAnalise(dadosVideo.analises[indice]) : []
  }, [emVideo, tempo, dadosVideo, indice])

  const chave = useMemo(
    () => escolherMensagem(deteccoes.filter((d) => d.confianca >= limiar)),
    [deteccoes, limiar],
  )

  const duracao = emVideo ? duracaoVideo || dadosVideo?.analises.at(-1)?.t || 0 : DURACAO_SIM
  const pronto = emVideo ? playerPronto && !!dadosVideo : true

  const segmentos = useMemo(() => {
    if (emVideo) return dadosVideo ? segmentosDoVideo(dadosVideo.analises, limiar, duracao) : []
    return CENAS.map((c) => ({
      chave: escolherMensagem(c.deteccoes.filter((d) => d.confianca >= limiar)),
      peso: c.fim - c.inicio,
    }))
  }, [emVideo, dadosVideo, limiar, duracao])

  const avisar = useCallback(
    (k) => {
      const estado = ESTADOS[k]
      if (voz) falar(estado.fala)
      if (vibrar && vibraDisponivel && estado.vibracao) navigator.vibrate(estado.vibracao)
    },
    [voz, vibrar],
  )

  // rua simulada: relógio próprio, uma análise a cada 0,5 s
  useEffect(() => {
    if (emVideo || !tocando) return
    const id = setInterval(() => {
      setTempo((t) => {
        const prox = t + INTERVALO_ANALISE
        if (prox >= DURACAO_SIM) {
          setTocando(false)
          return DURACAO_SIM
        }
        return prox
      })
      setAnalises((n) => n + 1)
    }, INTERVALO_ANALISE * 1000)
    return () => clearInterval(id)
  }, [tocando, emVideo])

  // vídeo real: conta uma análise sempre que o vídeo passa para o próximo quadro analisado
  useEffect(() => {
    if (emVideo && tocando && indice >= 0) setAnalises((n) => n + 1)
  }, [indice, emVideo, tocando])

  // registra e anuncia só quando o aviso muda
  useEffect(() => {
    if (!tocando || chave === ultimoAviso.current) return
    ultimoAviso.current = chave
    setHistorico((h) => [{ id: `${tempo}-${chave}-${h.length}`, tempo, chave }, ...h].slice(0, 200))
    avisar(chave)
  }, [chave, tocando, tempo, avisar])

  function limpar() {
    if (vozDisponivel) window.speechSynthesis.cancel()
    ultimoAviso.current = null
    setHistorico([])
    setAnalises(0)
  }

  function alternar() {
    if (emVideo) {
      if (tocando) player.current?.pausar()
      else player.current?.tocar()
      return
    }
    if (tempo >= DURACAO_SIM) {
      limpar()
      setTempo(0)
      setTocando(true)
    } else setTocando((v) => !v)
  }

  function reiniciar() {
    limpar()
    setTempo(0)
    if (emVideo) {
      player.current?.pausar()
      player.current?.buscar(0)
    }
    setTocando(false)
  }

  function buscar(t) {
    if (emVideo) player.current?.buscar(t)
    setTempo(t)
  }

  function trocarModo(novo) {
    if (novo === modo) return
    player.current?.pausar()
    limpar()
    setTocando(false)
    setTempo(0)
    setPlayerPronto(false)
    setModo(novo)
  }

  const visual = emVideo ? (
    <>
      <PlayerYouTube
        ref={player}
        videoId={VIDEO_PADRAO.id}
        aoPronto={(d) => {
          setDuracaoVideo(d)
          setPlayerPronto(true)
        }}
        aoMudarEstado={(tocandoAgora, terminou) => {
          setTocando(tocandoAgora)
          if (terminou) setTempo(duracaoVideo)
        }}
        aoTempo={setTempo}
        aoErro={setErroVideo}
      />
      {dadosVideo && (
        <CaixasDeteccao
          largura={dadosVideo.largura}
          altura={dadosVideo.altura}
          deteccoes={deteccoes}
          limiar={limiar}
          tempo={tempo}
        />
      )}
      {erroVideo && (
        <div className="absolute inset-0 grid place-items-center bg-asfalto/95 p-6 text-center">
          <div>
            <p className="font-bold">{erroVideo}</p>
            <button
              type="button"
              onClick={() => trocarModo('simulado')}
              className="mt-4 rounded-full bg-tatil px-5 py-2.5 font-bold text-asfalto"
            >
              Usar a rua simulada
            </button>
          </div>
        </div>
      )}
    </>
  ) : (
    <CenaRua rua={cenaNoTempo(tempo).rua} deteccoes={deteccoes} limiar={limiar} tempo={tempo} />
  )

  return (
    <div className="min-h-dvh">
      <a
        href="#demonstracao"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-tatil focus:px-4 focus:py-2 focus:font-bold"
      >
        Ir para a demonstração
      </a>

      <header className="bg-asfalto text-faixa">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="#" className="flex items-center gap-3" aria-label={`${NOME_PRODUTO}, início`}>
            <svg viewBox="0 0 40 40" className="size-10" aria-hidden="true">
              <rect width="40" height="40" rx="10" fill="#3D434C" />
              <rect x="7" y="25" width="5" height="10" fill="#F7F8F5" />
              <rect x="17.5" y="25" width="5" height="10" fill="#F7F8F5" />
              <rect x="28" y="25" width="5" height="10" fill="#F7F8F5" />
              <circle cx="20" cy="13" r="7" fill="#14A363" />
            </svg>
            <span className="font-sinal text-2xl font-black tracking-tight">{NOME_PRODUTO}</span>
          </a>
          <nav aria-label="Principal">
            <a
              href="#como-funciona"
              className="rounded-full px-4 py-2 font-bold text-concreto hover:bg-asfalto-claro"
            >
              Como funciona
            </a>
          </nav>
        </div>
        {/* faixa de pedestre como borda do cabeçalho */}
        <div
          className="h-3"
          style={{ background: 'repeating-linear-gradient(90deg, #F7F8F5 0 34px, transparent 34px 60px)' }}
          aria-hidden="true"
        />
      </header>

      <main>
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:px-6 lg:pt-12">
          <h1 className="max-w-[20ch] font-sinal text-[2.1rem] leading-[1.05] font-black tracking-[-0.015em] text-balance sm:text-5xl lg:text-6xl">
            A faixa e o sinal, ditos em voz alta.
          </h1>
          <p className="mt-4 max-w-[58ch] text-lg leading-relaxed text-asfalto/85">
            Assistente para pessoas cegas e com baixa visão. A câmera reconhece faixa de pedestre e
            semáforo e avisa por voz e vibração. Aperte “Iniciar” para ver o assistente analisando um vídeo
            real de rua.
          </p>
        </div>

        <div
          id="demonstracao"
          className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-6 sm:px-6 lg:grid lg:grid-cols-[1.45fr_1fr] lg:items-start lg:gap-5"
        >
          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <div className="order-2 lg:order-none">
              <Camera
                modo={modo}
                aoTrocarModo={trocarModo}
                segmentos={segmentos}
                tempo={tempo}
                duracao={duracao}
                tocando={tocando}
                pronto={pronto}
                aoTocar={alternar}
                aoReiniciar={reiniciar}
                aoBuscar={buscar}
                rodape={
                  emVideo ? (
                    <>
                      Vídeo de rua em São Paulo à noite, o mesmo que o main.py usa por padrão.{' '}
                      <a href={VIDEO_PADRAO.url} target="_blank" rel="noreferrer" className="underline hover:text-white">
                        Abrir no YouTube
                      </a>
                      . As caixas são as detecções reais do modelo neste vídeo, calculadas antes e salvas no site.
                    </>
                  ) : (
                    'Rua desenhada para mostrar cada um dos seis avisos possíveis.'
                  )
                }
              >
                {visual}
              </Camera>
            </div>
            <div className="order-5 lg:order-none">
              <Historico itens={historico} analises={analises} />
            </div>
          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <div className="order-1 lg:order-none">
              <PainelSinal chave={chave} tocando={tocando} aoRepetir={() => avisar(chave)} />
            </div>
            <div className="order-3 lg:order-none">
              <ListaDeteccoes deteccoes={deteccoes} limiar={limiar} />
            </div>
            <div className="order-4 lg:order-none">
              <Ajustes
                limiar={limiar}
                setLimiar={setLimiar}
                voz={voz}
                setVoz={setVoz}
                vibrar={vibrar}
                setVibrar={setVibrar}
                vozDisponivel={vozDisponivel}
                vibraDisponivel={vibraDisponivel}
              />
            </div>
          </div>
        </div>

        <ComoFunciona />
      </main>

      <footer className="bg-asfalto text-concreto-escuro">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm sm:flex-row sm:justify-between sm:px-6">
          <p>Projeto CitizenTech, Global Solution FIAP 2026.2</p>
          <p>Visão computacional com Roboflow. Esta página usa dados simulados.</p>
        </div>
      </footer>
    </div>
  )
}
