# Travessia — Assistente de semáforo para pedestres

> MVP da **Global Solution FIAP 2026.2 — CitizenTech**, empacotado em container,
> provisionado na VPS via **Terraform (IaC)** e publicado com Docker Compose e Nginx.

**URL pública:** <http://4.168.236.152/>
**Repositório público:** <https://github.com/guicvsub/gs-dev-sec>
**Pipeline:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
**Relatório:** [`docs/RELATORIO.md`](docs/RELATORIO.md) • **Evidências:** [`docs/EVIDENCIAS.md`](docs/EVIDENCIAS.md) • **Guia de deploy:** [`DEPLOY.md`](DEPLOY.md)

![Arquitetura do Deploy](docs/arquitetura.svg)

---

## Ficha Técnica do MVP

| Campo | Descrição |
| --- | --- |
| **Nome** | Travessia — assistente de semáforo para pedestres |
| **Projeto** | CitizenTech — FIAP Global Solution 2026.2 |
| **Atividade** | Deploy seguro em VPS (Secure DevOps Tools & Cloud Computing) |
| **Equipe** | GS7 (Global Solution 7) |
| **Integrantes** | Guilherme Santiago da Silva (RM552321), Gustavo Govea Soares (RM553842), Pedro Henrique Mello Silva Alves (RM554223), Gabriel Borba (RM553187) |
| **Problema** | Pessoas cegas ou com baixa visão não conseguem interpretar com segurança a faixa de pedestre e o semáforo ao atravessar a rua. |
| **Solução** | Uma câmera vestível (ESP32-CAM) filma a via; o software reconhece faixa, semáforo e veículos e devolve um aviso simples em tela, voz e vibração. |
| **MVP demonstrável** | Site em React que reproduz um vídeo público de São Paulo com as detecções do modelo sobrepostas e o aviso acessível. Usa detecções já salvas, então **não precisa de chave do Roboflow para rodar**. |
| **Público-alvo** | Pessoas com deficiência visual, seus acompanhantes e equipes de mobilidade urbana. |
| **Stack** | React 19 + Vite 8 + Tailwind 4; Python 3.13 + OpenCV + Roboflow (núcleo opcional); Docker; Nginx unprivileged; Terraform (OpenStack); GitHub Actions. |
| **Infraestrutura** | VPS Linux (AIS) provisionada por **Terraform** (OpenStack); Docker Compose + Nginx na porta 80. State e `.tfvars` ficam **fora do repo**. |
| **Segurança** | Gitleaks, Semgrep e **Trivy** bloqueando o pipeline; secrets (chave SSH) em **GitHub Secrets**; porta admin/SSH **nunca** aberta para `0.0.0.0/0` (só a 80 é pública). |
| **Observabilidade** | **Prometheus + Grafana locais** com as **4 métricas de ouro** (latência, tráfego, erros e saturação) apontando para o MVP publicado, com **alerta disparado**. |
| **Status** | **No ar** em <http://4.168.236.152/> (VPS AIS, Ubuntu 24.04, Docker + Nginx) |

---

## O que é o MVP

No produto final, uma câmera vestível ESP32-CAM filma a rua à frente de uma pessoa cega ou
com baixa visão. O software reconhece faixa de pedestre e semáforo e transforma o que viu
em um aviso simples.

Para esta demonstração, **a imagem da ESP32-CAM foi substituída por um vídeo público do
YouTube** gravado em uma rua de São Paulo. O vídeo passa pelo mesmo caminho que a câmera
faria: cada quadro é enviado ao modelo de visão computacional, e o resultado vira uma das
mensagens abaixo. Trocar o vídeo pela câmera exige mudar só a fonte da imagem; a análise e
as regras continuam as mesmas.

O projeto tem duas partes:

- **`main.py` + `utility/`**: núcleo em Python, que analisa o vídeo com o modelo do Roboflow.
- **`frontend/`**: página em React + Tailwind que apresenta o MVP. Ela toca o mesmo vídeo
  com as detecções do modelo por cima e mostra o aviso em tela, por voz e por vibração.
  A página não tem back-end: usa as detecções já geradas em
  `frontend/public/dados/deteccoes-video.json`.

> O site é o **MVP público** e é o que sobe na VPS. O núcleo em Python é opcional, roda em
> modo headless e consome créditos do Roboflow; ele não é iniciado pelo pipeline.

### Funcionalidades

- Reproduz um vídeo do YouTube em uma janela.
- Sobrepõe as detecções do modelo (classes `pedestrian_crossing`, `green_light`,
  `red_light` e `vehicle`) ao vídeo.
- A cada análise, gera uma das mensagens:
  - "Faixa de pedestre e semáforo verde a frente"
  - "Faixa de pedestre e semáforo vermelho a frente"
  - "Faixa de pedestre sem semáforo a frente"
  - "Semáforo verde a frente (sem faixa de pedestre)"
  - "Semáforo vermelho a frente (sem faixa de pedestre)"
  - "----------Nada relevante pode ser detectado----------"
  > Se houver semáforo verde e vermelho no mesmo frame, vale o de maior confiança.
- Mostra o aviso em tela, fala o aviso e aciona a vibração no celular.
- No núcleo Python, os frames com detecção aparecem em uma segunda janela; **Q** ou
  **ESC** encerram.

---

## Arquitetura

O diagrama completo está em [`docs/arquitetura.svg`](docs/arquitetura.svg) e é reproduzido
no [relatório](docs/RELATORIO.md). O fluxo é:

```text
git push na main
        │
        ▼
GitHub Actions — security (Gitleaks + Semgrep + Trivy)
        │
        ▼
GitHub Actions — build da imagem Docker
        │
        ▼
GitHub Actions — deploy automático (SSH → VPS AIS → docker compose up)
        │
        ▼
VPS AIS (Ubuntu 24.04) — Docker Compose + Nginx não-root :8080 → porta 80
        │
        └─ Observabilidade local: Prometheus + Grafana
```

| Camada | Componente | Papel |
| --- | --- | --- |
| Aplicação | Container `web` (Docker) | Servir o site em React via Nginx. |
| Servidor | VPS AIS (Ubuntu 24.04) | Provisionada por **Terraform (OpenStack)**; IP público fixo. |
| Proxy/Web | Nginx unprivileged | Expoe a porta 80 e serve os arquivos estáticos. |
| CI/CD | GitHub Actions | Gitleaks + Semgrep + Trivy, build e **deploy automático via SSH**. |
| Observabilidade | Prometheus + Grafana (locais) | 4 métricas de ouro do MVP publicado + alerta. |

### Por que o site não precisa do Roboflow em produção?

As detecções usadas na apresentação já estão no arquivo
`frontend/public/dados/deteccoes-video.json`. O build do Vite copia esse arquivo para a
imagem; o Nginx o serve como conteúdo estático. Assim, o deploy público não expõe chave
de API, não gasta créditos e não depende do YouTube para carregar as detecções.

---

## Pipeline DevSecOps

O workflow principal é o [`deploy.yml`](.github/workflows/deploy.yml). Ele roda em todo
push na `main` e também pode ser disparado manualmente em **Actions → Deploy → Run
workflow**.

| Ordem | Job | Ferramenta | O que valida | Se falhar |
| --- | --- | --- | --- | --- |
| 1 | `security` → `gitleaks` | Gitleaks 8.28 | Segredos no histórico completo do Git (fetch-depth 0). | O deploy não começa. |
| 2 | `security` → `semgrep` | Semgrep (`p/default` + `p/secrets`) | SAST de Python, JavaScript, Dockerfile e workflows. | O deploy não começa. |
| 3 | `security` → `trivy` | Trivy | Vulnerabilidades CRITICAL/HIGH na imagem Docker. | O deploy não começa. |
| 4 | `build` | Docker | Build da imagem `travessia-web`. | O site antigo continua no ar na VPS. |
| 5 | `deploy` → SSH | appleboy/ssh-action | `git pull` + `docker compose up -d --build` na VPS via chave SSH (GitHub Secret). | O site antigo continua no ar. |
| 6 | `deploy` → verificação | `curl` | `GET http://IP/` precisa responder **200**. | O job falha; a URL não é considerada no ar. |

**Deploy automático e secrets:**

- O deploy roda automaticamente a cada push na `main` (e por `workflow_dispatch`).
- A chave SSH (`VPS_SSH_KEY`), o usuário (`VPS_USER`) e a porta (`VPS_SSH_PORT`) ficam em
  **GitHub Secrets** — nunca no código.
- Host e caminho na VPS podem vir de **variables** (`VPS_HOST`, `VPS_PATH`).

O workflow de PR (`.github/workflows/pr.yml`) repete a segurança e faz o build da imagem
sem publicar nada.

**Decisões de segurança do pipeline:**

- As actions são referenciadas pelo **SHA completo** do commit, não por tags móveis.
- O Gitleaks roda com `--redact` e falha com `--exit-code 1`; Semgrep e Trivy publicam
  relatórios SARIF como artefatos.
- O container roda como usuário **nginx (UID 101)**, não como root.
- O `.env` real (com a chave do Roboflow) nunca entra no repositório.

---

## Observabilidade (Prometheus + Grafana)

As **4 métricas de ouro** do MVP publicado são exibidas em um **Grafana** local, alimentado
por **Prometheus**. A rubrica permite Prometheus/Grafana rodando localmente apontando para
o MVP no ar.

```bash
docker compose -f docker-compose.observability.yml up -d
# Prometheus: http://localhost:9090   Grafana: http://localhost:3000
```

| Métrica de ouro | Métrica no Prometheus | Fonte |
| --- | --- | --- |
| **Latência** | `probe_duration_seconds` | blackbox-exporter (sonda HTTP) |
| **Tráfego** | `rate(nginx_http_requests_total[5m])` | nginx-prometheus-exporter (`/stub_status`) |
| **Erros / Disponibilidade** | `probe_success` | blackbox-exporter |
| **Saturação** | `nginx_connections_active` | nginx-prometheus-exporter |

**Alertas** (`monitoring/alerts.yml`): `MVPDown` (fora do ar por 1 min) e
`MVPHighLatency` (latência > 3 s). O dashboard `Travessia - 4 Métricas de Ouro` é
provisionado automaticamente no Grafana e mostra as 4 métricas + alertas.

> O Nginx expõe `/stub_status` (read-only) para o exporter coletar as métricas.

---

## IaC com Terraform (OpenStack)

A VPS é provisionada como código em [`terraform/`](terraform/):

- `versions.tf`, `providers.tf`, `variables.tf`, `network.tf`, `compute.tf`, `outputs.tf`.
- **State e `.tfvars` ficam fora do repositório** (no `.gitignore`).
- **Porta administrativa/SSH nunca é aberta para `0.0.0.0/0`** — só a porta 80 é pública;
  o SSH é restrito a um CIDR específico (`admin_ssh_cidr`).

```bash
cd terraform
terraform init -backend-config=backend.hcl   # backend preenchido fora do repo
terraform plan -var-file=tfvars.example       # ajuste o .tfvars (não versionado)
terraform apply -var-file=terraform.tfvars
```

---

## Como rodar localmente

### Site com Docker (recomendado)

```bash
docker compose up -d --build web
```

Abra `http://localhost` (ou a porta definida em `WEB_PORT`). O compose usa a imagem
`nginxinc/nginx-unprivileged` e mapeia `80:8080`; se a porta 80 estiver ocupada:

```powershell
$env:WEB_PORT="8085"; docker compose up -d --build web
```

Verificação rápida:

```bash
docker compose ps
curl -I http://localhost
docker compose logs web
```

> Use sempre `--build` depois de mudar o Dockerfile ou o `nginx.conf`; sem isso o Compose
> reutiliza a imagem antiga em cache.

### Front-end em modo de desenvolvimento

```powershell
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173` e aperte **Iniciar**. O site não precisa do Python nem da
chave do Roboflow.

### Núcleo em Python (opcional)

1. Crie e ative o ambiente virtual:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
2. Instale as dependências:
   ```powershell
   python -m pip install -r .\requirements.txt
   ```
3. Crie o `.env` a partir do exemplo e preencha a chave:
   ```powershell
   Copy-Item .env.example .env
   ```
   ```env
   ROBOFLOW_API_KEY=sua_chave_do_roboflow_aqui
   VIDEO_URL=https://youtu.be/seu_video_de_preferencia
   ```
   > O `.env` é ignorado pelo Git. **Nunca** faça commit dele.
4. Execute:
   ```powershell
   python main.py
   ```
   Para rodar sem interface gráfica (headless), defina `HEADLESS=1`; é o modo usado no
   container `core`.

### Núcleo em Python com Docker (opcional)

```bash
docker compose --profile core up -d --build
docker compose logs -f core
```

O perfil `core` consome créditos do Roboflow (≈ 2 chamadas/s) e não é iniciado pelo
pipeline de produção.

---

## Deploy em produção (VPS AIS)

O passo a passo completo está em [`DEPLOY.md`](DEPLOY.md). Resumo:

1. **Crie um repositório público** no GitHub e envie este projeto para a branch `main`.
2. **Provisione a VPS com Terraform** (OpenStack/AIS): `terraform apply`. Isso cria a
   instância, o floating IP e o security group (só a porta 80 é pública).
3. **Configure os GitHub Secrets** do pipeline: `VPS_SSH_KEY`, `VPS_USER` (e opcionalmente
   `VPS_SSH_PORT`) e as variables `VPS_HOST`, `VPS_PATH`.
4. **Faça o push na `main`**: o pipeline roda Gitleaks + Semgrep + Trivy, builda a imagem
   e faz o **deploy automático via SSH** (`git pull` + `docker compose up -d --build web`).
5. Confirme que a URL responde: `curl -I http://IP_DA_VPS`.

> O pipeline deploys sozinho. Para observabilidade, suba o Prometheus + Grafana locais
> (seção acima) apontando para o MVP.

---

## Dados pessoais e LGPD

O MVP reproduz um **vídeo público de uma rua de São Paulo** que pode conter **pessoas
(imagens), além de placas de carros e identificadores**. Tratamento:

| Dado | Onde fica | Observação |
| --- | --- | --- |
| Imagens/vídeo (pessoas visíveis) | Vídeo público do YouTube referenciado | Não é coletado nem armazenado pela aplicação. |
| Detecções pré-computadas | `frontend/public/dados/deteccoes-video.json` | São apenas **bounding boxes e classes** (`pedestrian_crossing`, `green_light`, `red_light`, `vehicle`) — **não contêm rostos reconhecíveis**. |
| Dados do usuário final | Nenhum | O site **não coleta** nome, e-mail, localização nem qualquer dado pessoal do usuário. |

**Responsabilidade compartilhada (modelo CSP):**

- **Provedor (AIS):** segurança física e de infraestrutura da VPS, disponibilidade da
  rede e da plataforma do datacenter.
- **Cliente (nós/equipe):** a aplicação, o container, as credenciais (secrets), os dados
  processados, as configurações de segurança e o cumprimento da LGPD sobre os dados.
- A aplicação é stateless e **não persiste dados pessoais**; por isso o risco à privacidade
  é mínimo. Não há coleta, processamento ou compartilhamento de dados pessoais no MVP.

---

## Estrutura do repositório

```text
.
├── .github/workflows/
│   ├── security.yml        # Gitleaks + Semgrep + Trivy (reutilizável)
│   ├── pr.yml              # segurança + build da imagem
│   └── deploy.yml          # pipeline principal (build + deploy automático SSH)
├── terraform/              # IaC da VPS (OpenStack) - state/.tfvars fora do repo
│   ├── versions.tf
│   ├── providers.tf
│   ├── variables.tf        # inclui admin_ssh_cidr (nunca 0.0.0.0/0)
│   ├── network.tf          # security group (só 80 pública)
│   ├── compute.tf
│   ├── outputs.tf
│   ├── backend.hcl.example
│   └── tfvars.example
├── scripts/
│   └── deploy-vps.sh       # deploy manual na VPS (Docker Compose)
├── monitoring/             # Prometheus + Grafana locais
│   ├── prometheus.yml
│   ├── alerts.yml
│   ├── blackbox.yml
│   ├── dashboards/travessia-golden.json
│   └── provisioning/
├── docker-compose.yml
├── docker-compose.observability.yml   # stack de observabilidade local
├── Dockerfile              # build do site + Nginx unprivileged :8080
├── Dockerfile.core         # núcleo Python headless (opcional)
├── nginx.conf              # logs JSON, /stub_status, headers, SPA fallback
├── frontend/               # site React + Vite
├── main.py + utility/      # núcleo Python (opcional)
├── docs/
│   ├── arquitetura.svg
│   ├── RELATORIO.md
│   ├── EVIDENCIAS.md
│   ├── relatorio.html      # versão para exportar em PDF
│   └── prints/             # prints das evidências
├── DEPLOY.md
└── README.md
```

---

## Segurança e limitações

- **Segredos:** o `.env` real fica fora do Git; o `.env.example` tem apenas placeholder.
  A chave SSH e o usuário da VPS ficam em **GitHub Secrets**. Se uma chave vazar no
  histórico, o Gitleaks bloqueia o pipeline. Nesse caso, **rotacione a chave** e reescreva
  o histórico (ou recrie o repositório).
- **Porta admin:** o **SSH/porta administrativa nunca é aberta para `0.0.0.0/0`** — apenas
  a porta 80 é pública (definido no `terraform/network.tf` via `admin_ssh_cidr`).
- **State e `.tfvars`:** ficam **fora do repositório** (`.gitignore`), conforme a rubrica.
- **CI/CD:** o pipeline roda Gitleaks, Semgrep e **Trivy** e faz **deploy automático via
  SSH**. Vulnerabilidade CRITICAL/HIGH na imagem bloqueia o deploy.
- **HTTP:** o MVP é publicado em HTTP (sem domínio/HTTPS). Uma evolução é usar um proxy
  TLS (Caddy com Let's Encrypt, por exemplo).
- **Backup:** recomenda-se criar snapshots periódicos da VPS.

---

## Custos estimados

Provedor **AIS (plano VPS)** — estimativa mensal aproximada, por mês:

| Item | Estimativa/mês |
| --- | --- |
| VPS AIS (CPU 1–2 vCPU, 2–4 GB RAM, disco 20–40 GB) | **R$ 40–80** |
| IP público (floating IP), se cobrado | R$ 0–10 |
| Tráfego de saída (MVP de baixa demanda) | ~R$ 0–5 |
| **Total estimado** | **≈ R$ 45–95/mês** |

> Valor de referência; confirme o plano vigente no site da AIS. O custo é fixo e
> previsível (sem serviços gerenciados de nuvem). O núcleo Python opcional consome
> créditos do Roboflow à parte.

---

## Equipe

| Nome | RM | Responsabilidade |
| --- | --- | --- |
| Guilherme Santiago da Silva | RM552321 | Full-stack / infraestrutura |
| Gustavo Govea Soares | RM553842 | Front-end / interface |
| Pedro Henrique Mello Silva Alves | RM554223 | Núcleo Python / visão computacional |
| Gabriel Borba | RM553187 | Pipeline / DevSecOps |

---

## Referências

- [Guia de deploy na VPS](DEPLOY.md)
- [Relatório do Deploy](docs/RELATORIO.md)
- [Checklist de evidências](docs/EVIDENCIAS.md)
- [Documentação do front-end](frontend/README.md)
- [GitHub Actions — reusing workflows](https://docs.github.com/actions/using-workflows/reusing-workflows)