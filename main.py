import os
import sys
import time
import signal
import threading
from concurrent.futures import ThreadPoolExecutor

import cv2
from inference_sdk import InferenceHTTPClient, InferenceConfiguration

from utility.box_format import box_resize, draw_box, box_time_stamp
from utility.stream_format import format_stream
from utility.classes import class_classify, build_message

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


def _env_bool(nome: str, padrao: bool = False) -> bool:
    valor = os.getenv(nome)
    if valor is None:
        return padrao
    return valor.strip().lower() in ("1", "true", "sim", "yes", "on")


VIDEO_URL = os.getenv("VIDEO_URL", "https://www.youtube.com/watch?v=zIIIr0ZFQY4")

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "chave")
ROBOFLOW_URL = os.getenv("ROBOFLOW_URL", "https://serverless.roboflow.com")
MODEL_ID = os.getenv("MODEL_ID", "pedestrian-light-crossing-uoz6o/1")

INTERVALO_ANALISE = float(os.getenv("INTERVALO_ANALISE", "0.5"))  # segundos entre análises
CONFIANCA_MIN = float(os.getenv("CONFIANCA_MIN", "0.50"))         # ignora detecções abaixo disso (0 a 1)
MAX_RESOLUTION = int(os.getenv("MAX_RESOLUTION", "720"))          # altura máxima do stream do YouTube
LARGURA_JANELA = int(os.getenv("LARGURA_JANELA", "960"))          # largura máxima das janelas exibidas
REPETIR_VIDEO = _env_bool("REPETIR_VIDEO")                        # True = reinicia o vídeo quando acabar
SALVAR_DETECCOES = _env_bool("SALVAR_DETECCOES")                  # True = também salva cada frame detectado em disco
PASTA_DETECCOES = os.getenv("PASTA_DETECCOES", "deteccoes")

# Em VPS/servidor não existe tela: roda sem janelas (só terminal e arquivos).
HEADLESS = _env_bool("HEADLESS") or (sys.platform.startswith("linux") and not os.getenv("DISPLAY"))

JANELA_VIDEO = "Video"
JANELA_DETECCAO = "Deteccoes"

## CLIENTE ROBOFLOW
CLIENT = InferenceHTTPClient(
    api_url=ROBOFLOW_URL,
    api_key=ROBOFLOW_API_KEY,
).configure(InferenceConfiguration(
    api_key_transport="header"  # autenticação por header (inference v1.5.0+)
))

## Estado compartilhado entre a thread principal e a thread de análise
_lock = threading.Lock()
_ultimo_anotado = {"img": None, "versao": 0}
_classes_vistas = set()


## ANÁLISE (roda em thread separada para não travar o vídeo)
def analisar(frame, tempo_video: float):
    try:
        resultado = CLIENT.infer(frame, model_id=MODEL_ID)
    except Exception as e:
        print(f"[{box_time_stamp(tempo_video)}] Erro ao consultar o Roboflow: {e}")
        return

    deteccoes = []
    for p in resultado.get("predictions", []):
        classe = str(p.get("class", ""))
        conf = float(p.get("confidence", 0))

        if classe not in _classes_vistas:
            _classes_vistas.add(classe)
            print(f"(classe do modelo encontrada: '{classe}')")

        if conf < CONFIANCA_MIN:
            continue

        deteccoes.append({
            "x": p["x"], "y": p["y"], "width": p["width"], "height": p["height"],
            "classe": classe, "confianca": conf, "cor": class_classify(classe),
        })

    carimbo = box_time_stamp(tempo_video)
    mensagem = build_message(deteccoes)

    if not deteccoes:
        print(f"[{carimbo}] {mensagem}")
        return

    anotado = box_resize(draw_box(frame, deteccoes), LARGURA_JANELA)
    cv2.putText(anotado, f"Video {carimbo}", (10, 28),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)

    # Publica o frame e imprime a mensagem juntos, para saírem ao mesmo tempo
    with _lock:
        _ultimo_anotado["img"] = anotado
        _ultimo_anotado["versao"] += 1
        print(f"[{carimbo}] {mensagem}")

    if SALVAR_DETECCOES:
        os.makedirs(PASTA_DETECCOES, exist_ok=True)
        nome = f"deteccao_{int(tempo_video * 1000):08d}.jpg"
        cv2.imwrite(os.path.join(PASTA_DETECCOES, nome), anotado)


def _encerrar(signum, frame):
    """Converte SIGTERM (docker stop) em KeyboardInterrupt para cair no finally."""
    raise KeyboardInterrupt


def main():
    if ROBOFLOW_API_KEY in ("", "chave"):
        print("\t>Defina a variável ROBOFLOW_API_KEY (ou um .env) com a sua chave do Roboflow.")
        sys.exit(1)

    if VIDEO_URL == "":
        print("\t>Variável VIDEO_URL não foi definida corretamente. Insira seu vídeo de preferência do youtube ou elimine a variável para utilizar o vídeo padrão")
        sys.exit(1)

    if threading.current_thread() is threading.main_thread():
        signal.signal(signal.SIGTERM, _encerrar)

    source = format_stream(VIDEO_URL, MAX_RESOLUTION)
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print("Não foi possível abrir o vídeo:", VIDEO_URL)
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps != fps or fps < 1:
        fps = 30.0
    intervalo_frame = 1.0 / fps

    if not HEADLESS:
        cv2.namedWindow(JANELA_VIDEO, cv2.WINDOW_AUTOSIZE)
    janela_deteccao_aberta = False

    executor = ThreadPoolExecutor(max_workers=1)
    futuro = None
    proxima_analise = time.time()
    proximo_frame = time.time()
    frames_lidos = 0
    versao_exibida = 0

    if HEADLESS:
        print("Rodando sem janelas (headless). Ctrl+C ou 'docker stop' para sair.\n", flush=True)
    else:
        print("Rodando... (Q ou ESC para sair)\n")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                if REPETIR_VIDEO:
                    cap.release()
                    cap = cv2.VideoCapture(source)
                    frames_lidos = 0
                    continue
                print("\nVídeo terminou.")
                break

            frames_lidos += 1
            tempo_video = frames_lidos / fps

            # --- análise a cada INTERVALO_ANALISE s (se a anterior já terminou) ---
            agora = time.time()
            if agora >= proxima_analise and (futuro is None or futuro.done()):
                futuro = executor.submit(analisar, frame.copy(), tempo_video)
                proxima_analise = agora + INTERVALO_ANALISE

            # --- ritmo do vídeo (reprodução em tempo real) ---
            proximo_frame += intervalo_frame
            espera = proximo_frame - time.time()
            if espera < -1.0:            # ficou muito atrasado: ressincroniza
                proximo_frame = time.time()
                espera = 0

            if HEADLESS:
                if espera > 0:
                    time.sleep(espera)
                continue

            # --- janela do vídeo ---
            cv2.imshow(JANELA_VIDEO, box_resize(frame, LARGURA_JANELA))

            # --- janela única de detecções (só atualiza quando há frame novo) ---
            with _lock:
                versao = _ultimo_anotado["versao"]
                img = _ultimo_anotado["img"]
            if img is not None and versao != versao_exibida:
                cv2.imshow(JANELA_DETECCAO, img)
                janela_deteccao_aberta = True
                versao_exibida = versao

            tecla = cv2.waitKey(max(1, int(espera * 1000))) & 0xFF
            if tecla in (ord("q"), ord("Q"), 27):
                break
            if cv2.getWindowProperty(JANELA_VIDEO, cv2.WND_PROP_VISIBLE) < 1:
                break
            if janela_deteccao_aberta and \
                    cv2.getWindowProperty(JANELA_DETECCAO, cv2.WND_PROP_VISIBLE) < 1:
                # usuário fechou a janela de detecções: ela reabre na próxima detecção
                janela_deteccao_aberta = False
                versao_exibida = -1
    except KeyboardInterrupt:
        pass
    finally:
        executor.shutdown(wait=False, cancel_futures=True)
        cap.release()
        if not HEADLESS:
            cv2.destroyAllWindows()
        print("Encerrado.", flush=True)


if __name__ == "__main__":
    main()