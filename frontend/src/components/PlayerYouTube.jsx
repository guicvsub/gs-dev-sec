import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

let apiPromessa = null
function carregarApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromessa) {
    apiPromessa = new Promise((resolve, reject) => {
      const anterior = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        anterior?.()
        resolve(window.YT)
      }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      s.onerror = () => {
        apiPromessa = null
        reject(new Error('Não foi possível carregar o YouTube'))
      }
      document.head.appendChild(s)
    })
  }
  return apiPromessa
}

// Player do YouTube sem os controles próprios; quem controla é a página.
const PlayerYouTube = forwardRef(function PlayerYouTube({ videoId, aoPronto, aoMudarEstado, aoTempo, aoErro }, ref) {
  const alvo = useRef(null)
  const player = useRef(null)
  const cb = useRef({ aoPronto, aoMudarEstado, aoTempo, aoErro })
  cb.current = { aoPronto, aoMudarEstado, aoTempo, aoErro }

  useImperativeHandle(ref, () => ({
    tocar: () => player.current?.playVideo?.(),
    pausar: () => player.current?.pauseVideo?.(),
    buscar: (t) => {
      player.current?.seekTo?.(t, true)
      cb.current.aoTempo?.(t)
    },
  }))

  useEffect(() => {
    let cancelado = false
    let relogio = null

    carregarApi()
      .then((YT) => {
        if (cancelado || !alvo.current) return
        player.current = new YT.Player(alvo.current, {
          videoId,
          playerVars: { controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
          events: {
            onReady: (e) => {
              e.target.mute() // o áudio do vídeo não pode cobrir o aviso falado
              cb.current.aoPronto?.(e.target.getDuration())
            },
            onStateChange: (e) => {
              const tocando = e.data === YT.PlayerState.PLAYING
              cb.current.aoMudarEstado?.(tocando, e.data === YT.PlayerState.ENDED)
              clearInterval(relogio)
              if (tocando) {
                relogio = setInterval(() => cb.current.aoTempo?.(e.target.getCurrentTime()), 200)
              }
            },
            onError: () => cb.current.aoErro?.('O YouTube não liberou este vídeo para tocar aqui.'),
          },
        })
      })
      .catch((err) => cb.current.aoErro?.(err.message))

    return () => {
      cancelado = true
      clearInterval(relogio)
      player.current?.destroy?.()
      player.current = null
    }
  }, [videoId])

  return (
    // sem cliques no iframe: evita os menus do YouTube por cima das caixas; os botões da página controlam
    <div className="pointer-events-none absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full">
      <div ref={alvo} />
    </div>
  )
})

export default PlayerYouTube
