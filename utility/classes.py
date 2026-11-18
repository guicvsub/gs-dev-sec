MSG_FAIXA_VERDE = "Faixa de pedestre e semáforo verde a frente"
MSG_FAIXA_VERMELHO = "Faixa de pedestre e semáforo vermelho a frente"
MSG_FAIXA_SEM_SEMAFORO = "Faixa de pedestre sem semáforo a frente"
MSG_SEMAFORO_VERDE = "Semáforo verde a frente (sem faixa de pedestre)"
MSG_SEMAFORO_VERMELHO = "Semáforo vermelho a frente (sem faixa de pedestre)"
MSG_NADA = "----------Nada relevante pode ser detectado----------"


def class_classify(nome_classe: str):
    """Mapeia o nome da classe do modelo para 'verde', 'vermelho' ou None"""

    n = nome_classe.lower()
    if "green" in n or "verde" in n:
        return "verde"
    if "red" in n or "vermelho" in n:
        return "vermelho"
    return None


def is_crosswalk(nome_classe: str) -> bool:
    """True se a classe do modelo representa uma faixa de pedestre"""

    n = nome_classe.lower()
    return "crossing" in n or "crosswalk" in n or "faixa" in n


def build_message(deteccoes) -> str:
    """Escolhe a mensagem a partir das detecções (já filtradas por confiança).

    Se houver semáforo verde e vermelho ao mesmo tempo, vale o de maior confiança.
    """

    tem_faixa = any(is_crosswalk(d["classe"]) for d in deteccoes)

    semaforos = [d for d in deteccoes if d["cor"]]
    cor = max(semaforos, key=lambda d: d["confianca"])["cor"] if semaforos else None

    if tem_faixa:
        if cor == "verde":
            return MSG_FAIXA_VERDE
        if cor == "vermelho":
            return MSG_FAIXA_VERMELHO
        return MSG_FAIXA_SEM_SEMAFORO
    if cor == "verde":
        return MSG_SEMAFORO_VERDE
    if cor == "vermelho":
        return MSG_SEMAFORO_VERMELHO
    return MSG_NADA
