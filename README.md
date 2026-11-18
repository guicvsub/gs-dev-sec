# Travessia — Assistente de semáforo para pedestres

> MVP da **Global Solution FIAP 2026.2 — CitizenTech**, preparado para a atividade
> **Deploy Blindado**: container, Terraform, pipeline DevSecOps e observabilidade na AWS.

**URL pública:** _preencher após o primeiro deploy_ (`http://IP_PUBLICO`)
**Repositório:** _preencher com a URL do GitHub_
**Pipeline:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
**Relatório:** [`docs/RELATORIO.md`](docs/RELATORIO.md) • **Evidências:** [`docs/EVIDENCIAS.md`](docs/EVIDENCIAS.md) • **Guia de deploy:** [`DEPLOY.md`](DEPLOY.md)

![Arquitetura do Deploy Blindado](docs/arquitetura.svg)

---

## Ficha Técnica do MVP

| Campo | Descrição |
| --- | --- |
| **Nome** | Travessia — assistente de semáforo para pedestres |
| **Projeto** | CitizenTech — FIAP Global Solution 2026.2 |
| **Atividade** | Deploy Blindado (Secure DevOps Tools & Cloud Computing) |
| **Equipe** | _[preencher nome da equipe]_ |
| **Integrantes** | _[Nome 1 — RMxxxxx]_, _[Nome 2 — RMxxxxx]_, _[Nome 3 — RMxxxxx]_ |
| **Problema** | Pessoas cegas ou com baixa visão não conseguem interpretar com segurança a faixa de pedestre e o semáforo ao atravessar a rua. |
| **Solução** | Uma câmera vestível (ESP32-CAM) filma a via; o software reconhece faixa, semáforo e veículos e devolve um aviso simples em tela, voz e vibração. |
| **MVP demonstrável** | Site em React que reproduz um vídeo público de São Paulo com as detecções do modelo sobrepostas e o aviso acessível. Usa detecções já salvas, então **não precisa de chave do Roboflow para rodar**. |
| **Público-alvo** | Pessoas com deficiência visual, seus acompanhantes e equipes de mobilidade urbana. |
| **Stack** | React 19 + Vite 8 + Tailwind 4; Python 3.13 + OpenCV + Roboflow (núcleo opcional); Docker; Nginx unprivileged; Terraform 1.10; AWS; GitHub Actions. |
| **Nuvem** | VPC + subnet pública, EC2 `t3.micro` (Ubuntu 24.04), Elastic IP, ECR, IAM, CloudWatch, SNS e S3. |
| **Segurança** | Gitleaks e Semgrep bloqueando o deploy; ECR com tags imutáveis e scan on push; IMDSv2; security group só com HTTP 80; **sem SSH** (acesso via SSM); EBS criptografado; actions fixadas por SHA. |
| **Observabilidade** | Logs JSON do Nginx no CloudWatch, dashboard `travessia-mvp`, alarmes de 5xx/CPU/status e alerta por e-mail via SNS. |
| **Custo estimado** | ≈ **US$ 13/mês** em `us-east-1` on-demand (EC2 + EBS + IPv4 público + serviços gerenciados). |
| **Status** | _[preencher: no ar em `http://...` / aguardando deploy]_ |

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

> O site é o **MVP público** e é o que sobe na AWS. O núcleo em Python é opcional, roda em
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
GitHub Actions — security (Gitleaks + Semgrep)
        │
        ▼
GitHub Actions — infrastructure (Terraform fmt/validate/apply)
        │
        ▼
GitHub Actions — deploy (build → ECR → SSM → healthcheck HTTP 200)
        │
        ▼
EC2 t3.micro (Docker + Nginx não-root :8080) ← Elastic IP ← navegador
        │
        ├─ logs JSON → CloudWatch Logs → dashboard + alarmes → SNS → e-mail
        └─ state do Terraform no S3
```

| Camada | Serviço | Papel |
| --- | --- | --- |
| Computação | EC2 `t3.micro` com Ubuntu 24.04 | Roda o container do site (Docker + Nginx). |
| Rede | VPC, subnet pública, Internet Gateway, Elastic IP | Expõe apenas a porta 80; sem porta 22. |
| Registry | Amazon ECR | Guarda as imagens; tags imutáveis e scan on push. |
| Acesso | SSM Session Manager + IAM Role | Administração sem SSH e sem chaves na instância. |
| IaC | Terraform + backend S3 | Cria VPC, EC2, ECR, IAM, CloudWatch, SNS e alarmes. |
| CI/CD | GitHub Actions | Segurança, build, push, apply e deploy. |
| Observabilidade | CloudWatch + SNS | Logs, dashboard, métricas e alertas por e-mail. |
| Estado | S3 versionado e criptografado | State remoto com lock nativo (Terraform ≥ 1.10). |

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
| 2 | `security` → `semgrep` | Semgrep (`p/default` + `p/secrets`) | SAST de Python, JavaScript, Terraform, Dockerfile e workflows. | O deploy não começa. |
| 3 | `infrastructure` | Terraform 1.10.5 | `fmt`, `validate` e `apply` com state no S3. | Nada é publicado. |
| 4 | `deploy` → build | Docker | Build da imagem e push para o ECR com tag `SHA-RUN_ATTEMPT`. | O container antigo continua no ar. |
| 5 | `deploy` → SSM | AWS Systems Manager | Pull da imagem, troca do container e healthcheck local. | O job falha com os logs do container. |
| 6 | `deploy` → verificação | `curl` | `GET http://IP/` precisa responder **200**. | O job falha; a URL não é considerada no ar. |

O workflow de PR (`.github/workflows/pr.yml`) repete a segurança, faz o build da imagem e
roda `terraform fmt -check` + `terraform validate` sem aplicar nada. O workflow
`.github/workflows/destroy.yml` existe para destruir a infraestrutura ao final da
atividade (mantendo o bucket de state).

**Decisões de segurança do pipeline:**

- As actions são referenciadas pelo **SHA completo** do commit, não por tags móveis.
- O Gitleaks roda com `--redact` e falha com `--exit-code 1`; o relatório do Semgrep é
  publicado como artefato SARIF.
- O ECR é **imutável**: uma tag publicada não pode ser sobrescrita; cada execução usa
  `SHA-RUN_ATTEMPT`.
- O deploy usa **SSM**, não SSH: a instância não tem chave `.pem` nem porta 22 aberta.
- O container roda como usuário **nginx (UID 101)**, não como root.

---

## Observabilidade

- **Logs:** o Nginx grava access logs em JSON no stdout; o Docker usa o driver `awslogs`
  para enviar ao log group `travessia-web` (retenção de 14 dias).
- **Métrica:** o metric filter `Http5xx` conta respostas com `status >= 500` no namespace
  `Travessia/Web`.
- **Dashboard:** `travessia-mvp`, com CPU, rede, erros 5xx, Logs Insights e estado dos
  alarmes.
- **Alarmes:** `travessia-http-5xx`, `travessia-cpu-high` e `travessia-status-check`.
  Todos publicam no tópico SNS `travessia-alerts`.
- **Alerta:** assinatura de e-mail no SNS. **Confirme o e-mail** após o primeiro apply
  (o Terraform cria a assinatura em estado `PendingConfirmation`).

O dashboard e os alarmes são criados pelo Terraform; a URL do dashboard aparece no
resumo do job de deploy e em `terraform output dashboard_url`.

---

## Custos

Estimativa de referência para `us-east-1`, preço on-demand, 730 horas/mês:

| Item | Cálculo | US$/mês |
| --- | --- | ---: |
| EC2 `t3.micro` | 730 h × US$ 0,0104 | 7,59 |
| EBS gp3 | 20 GB × US$ 0,08/GB | 1,60 |
| IPv4 público (Elastic IP) | 730 h × US$ 0,005 | 3,65 |
| ECR | ~0,1 GB + requests | 0,02 |
| CloudWatch Logs | ingestão/armazenamento pequenos | 0,10 |
| S3 (state) + SNS | < 1 MB + e-mails | 0,00 |
| **Total aproximado** | | **≈ 12,96** |

> Valores de referência; confirme na [calculadora da AWS](https://calculator.aws/).
> O IPv4 público é cobrado mesmo com a instância parada, e o EBS continua cobrando
> enquanto existir. Para encerrar tudo, use o workflow **Destroy** e depois exclua o
> bucket de state se não for mais usar.

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

## Deploy em produção (AWS)

O passo a passo completo, incluindo a criação do usuário IAM e a configuração dos
secrets, está em [`DEPLOY.md`](DEPLOY.md). Resumo:

1. **Crie um repositório público** no GitHub e envie este projeto para a branch `main`.
2. **Crie um usuário IAM** para o pipeline com as políticas `PowerUserAccess` e
   `IAMFullAccess` e gere uma access key.
3. No GitHub, em **Settings → Secrets and variables → Actions**, configure:
   - Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
   - Variables: `AWS_REGION` (`us-east-1`), `ALERT_EMAIL` (seu e-mail) e,
     opcionalmente, `TF_STATE_BUCKET`.
4. Rode o workflow **Deploy** (ou faça um push na `main`). Ele cria o bucket de state,
   aplica o Terraform, publica a imagem no ECR, faz o deploy via SSM e valida a URL.
5. **Confirme a assinatura do SNS** no e-mail que chegar e guarde a URL e o link do
   dashboard que aparecem no resumo do job.

> O primeiro deploy leva cerca de 8 a 12 minutos (criação da VPC/EC2 + instalação do
> Docker + pull da imagem). Os próximos são mais rápidos.

### Destruir a infraestrutura

Em **Actions → Destroy → Run workflow**, digite `destroy`. O workflow executa
`terraform destroy` e mantém o bucket de state. Para remover o bucket depois, use o
console da AWS ou a CLI.

---

## Estrutura do repositório

```text
.
├── .github/workflows/
│   ├── security.yml        # Gitleaks + Semgrep (reutilizável)
│   ├── pr.yml              # segurança + build + terraform validate
│   ├── deploy.yml          # pipeline principal (push na main)
│   └── destroy.yml         # terraform destroy manual
├── terraform/
│   ├── versions.tf         # provider AWS + backend S3
│   ├── providers.tf
│   ├── variables.tf
│   ├── network.tf          # VPC, subnet, IGW, security group
│   ├── compute.tf          # AMI, ECR, IAM, EC2, EIP
│   ├── observability.tf    # logs, métricas, dashboard, alarmes, SNS
│   ├── outputs.tf
│   ├── backend.hcl.example
│   └── scripts/user_data.sh
├── scripts/deploy-remote.sh
├── Dockerfile              # build do site + Nginx unprivileged :8080
├── Dockerfile.core         # núcleo Python headless (opcional)
├── docker-compose.yml
├── nginx.conf              # logs JSON, headers de segurança, SPA fallback
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
  Se uma chave vazar no histórico, o Gitleaks bloqueia o pipeline. Nesse caso, **rotacione
  a chave** e reescreva o histórico (ou recrie o repositório).
- **IAM:** para a atividade, o pipeline usa um usuário com `PowerUserAccess` +
  `IAMFullAccess` e chaves de longa duração. Em produção, o recomendado é **OIDC** entre
  GitHub Actions e AWS, com uma role de menor privilégio e sem access keys.
- **HTTP:** o MVP é publicado em HTTP (sem domínio/HTTPS). Uma evolução é usar CloudFront
  + ACM ou um proxy com Let's Encrypt.
- **Single instance:** uma única `t3.micro` em uma AZ, sem auto scaling. É adequado ao
  MVP e ao custo da atividade; produção exigiria ALB, multi-AZ e backup.
- **ECR scan:** o scan on push está habilitado, mas o pipeline não bloqueia por findings
  do scan; ele bloqueia por Gitleaks/Semgrep. Integrar o resultado do ECR ao gate é uma
  evolução natural.
- **Custo:** destrua a infraestrutura ao final da atividade para evitar cobranças
  contínuas de IPv4/EBS.

---

## Equipe

| Nome | RM | Responsabilidade |
| --- | --- | --- |
| _[preencher]_ | _[preencher]_ | _[preencher]_ |
| _[preencher]_ | _[preencher]_ | _[preencher]_ |
| _[preencher]_ | _[preencher]_ | _[preencher]_ |

---

## Referências

- [Guia de deploy na AWS](DEPLOY.md)
- [Relatório do Deploy Blindado](docs/RELATORIO.md)
- [Checklist de evidências](docs/EVIDENCIAS.md)
- [Documentação do front-end](frontend/README.md)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GitHub Actions — reusing workflows](https://docs.github.com/actions/using-workflows/reusing-workflows)
