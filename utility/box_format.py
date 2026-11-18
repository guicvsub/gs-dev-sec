import cv2


def box_resize(frame, largura_max: int):
    h, w = frame.shape[:2]
    if w <= largura_max:
        return frame
    escala = largura_max / w
    return cv2.resize(frame,
                      ( largura_max,
                        int(h * escala)),
                      interpolation=cv2.INTER_AREA)


def change_box_color(cor: str):
    """string -> BGR"""
    if cor == "verde":
        return (0, 200, 0)
    if cor == "vermelho":
        return (0, 0, 255)
    return (0, 220, 255)


def draw_box(frame, deteccoes):
    """Desenha as caixas (já filtradas) sobre uma cópia do frame"""

    img = frame.copy()
    for d in deteccoes:
        x, y, w, h = d["x"], d["y"], d["width"], d["height"]
        x1, y1 = int(x - w / 2), int(y - h / 2)
        x2, y2 = int(x + w / 2), int(y + h / 2)
        cor = change_box_color(d["cor"])
        cv2.rectangle(img, (x1, y1), (x2, y2), cor, 3)

        rotulo = f'{d["classe"]} {d["confianca"]:.0%}'
        (tw, th), base = cv2.getTextSize(rotulo, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        topo = max(0, y1 - th - base - 4)
        cv2.rectangle(img, (x1, topo), (x1 + tw + 6, topo + th + base + 4), cor, -1)
        cv2.putText(img, rotulo, (x1 + 3, topo + th + 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
    return img


def box_time_stamp(segundos: float) -> str:
    s = int(segundos)
    return f"{s // 60:02d}:{s % 60:02d}"