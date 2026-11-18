from yt_dlp import YoutubeDL


def format_stream(url: str, max_resolution: int) -> str:
    """Converte o link do YouTube em URL de stream direto (sem baixar)"""

    if not url.startswith(("http://", "https://")):
        return url
    print("\t>Processando stream do YouTube...")

    # Prefere H.264 (avc1): o FFmpeg embutido no opencv-python não decodifica AV1.
    # Se não houver H.264 na resolução pedida, cai para mp4 e depois para o melhor disponível.
    fmt = (f"bv*[height<={max_resolution}][vcodec^=avc1]"
           f"/bv*[height<={max_resolution}][ext=mp4]"
           f"/bv*[height<={max_resolution}]/b")
    opts = {"format": fmt,
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True}
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url,
                                download=False)
    if info.get("entries"):
        info = info["entries"][0]
    print(f"Stream pronto: formato {info.get('format_id')} ({info.get('height', '?')}p)")
    return info["url"]