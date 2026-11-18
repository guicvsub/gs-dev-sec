# Front-end: Travessia

Interface em React + Tailwind que mostra o assistente de faixa de pedestre e semáforo.
**Não tem back-end.** A câmera tem duas fontes:

1. **Vídeo real (padrão):** o vídeo padrão do `main.py` (YouTube `zIIIr0ZFQY4`) toca na página, e as caixas
   vêm de `public/dados/deteccoes-video.json`. Esse arquivo guarda as detecções reais do modelo
   `pedestrian-light-crossing-uoz6o/1`, geradas uma vez, a cada 0,5 s do vídeo (1.892 análises).
2. **Rua simulada:** uma rua desenhada com cenas de `src/data/cenas.js`, que passa pelos seis avisos.

A regra que escolhe o aviso (`src/lib/regras.js`) é a mesma de `utility/classes.py`.

## Como rodar

```powershell
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173. Para gerar a versão de publicação: `npm run build` (gera a pasta `dist/`).

## O que a tela mostra

- **Aviso atual:** painel grande que muda de cor conforme a situação (verde, vermelho, amarelo ou cinza).
- **Câmera:** quadro simulado com as caixas de detecção e a linha do tempo do vídeo.
- **O que o modelo viu:** confiança de cada detecção e o limite de 50%.
- **Ajustes:** limite de confiança, aviso por voz (Web Speech) e vibração (celulares Android).
- **Avisos dados:** histórico de cada mudança de aviso.
- **Como funciona:** as etapas e as seis mensagens possíveis.

## Onde mudar

- Nome do produto: `NOME_PRODUTO` em `src/App.jsx`.
- Cenas e confianças: `src/data/cenas.js`.
- Cores e fontes: bloco `@theme` em `src/index.css`.
