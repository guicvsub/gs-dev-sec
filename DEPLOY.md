# Deploy na VPS — guia de produção

Este guia leva o projeto do zero até o MVP no ar em uma **VPS Linux** (no nosso caso, a
VPS da AIS, Ubuntu 24.04). A VPS é **provisionada por Terraform (OpenStack/IaC)** e o
container é publicado e atualizado com **Docker Compose**, com **deploy automático via SSH**
no pipeline do GitHub Actions. Não depende de nenhum provedor de nuvem norte-americano —
a infraestrutura é a própria VPS da AIS.

> **Tempo estimado:** 40 a 60 minutos na primeira vez (Terraform + Docker + primeiro
> deploy).

---

## O que o deploy cria

```text
Terraform (OpenStack/AIS)
 ├── Instância Ubuntu 24.04
 ├── Floating IP (público)
 └── Security Group: só porta 80 pública; SSH/porta admin restrito (NUNCA 0.0.0.0/0)

VPS AIS (Ubuntu 24.04)
 ├── Docker + Docker Compose
 ├── Build da imagem do site (Dockerfile + Nginx unprivileged)
 ├── Container "web" publicado na porta 80 (:8080 interno)
 └── (opcional) perfil "core" para o núcleo Python
```

Antes do deploy, o pipeline do GitHub Actions executa **Gitleaks** (segredos), **Semgrep**
(SAST) e **Trivy** (vulnerabilidades da imagem). Se qualquer um falhar, o deploy não vai
para produção. O deploy é feito automaticamente via **SSH** na VPS.

---

## Pré-requisitos

- Conta no **AIS Provedor** (ou provedor OpenStack equivalente) com credenciais.
- Uma **VPS** com Ubuntu 24.04, IP público fixo e acesso SSH.
- Conta no GitHub.
- Terraform instalado na sua máquina (`terraform version` ≥ 1.4).
- Docker Desktop (opcional, só para testar localmente).

---

## 1. Provisionar a VPS com Terraform

> O `state` e o `.tfvars` ficam **fora do repositório** (exigência da rubrica).

1. Configure as credenciais do OpenStack (via variáveis de ambiente do provedor):
   `OS_AUTH_URL`, `OS_USERNAME`, `OS_PASSWORD`, `OS_PROJECT_NAME`, etc.
2. Preencha `terraform/tfvars.example` → copie para `terraform/terraform.tfvars`
   (não versionado) e ajuste os valores (credenciais, flavor, CIDR admin).
3. Rode:

   ```bash
   cd terraform
   terraform init -backend-config=backend.hcl   # backend fora do repo
   terraform plan -var-file=terraform.tfvars
   terraform apply -var-file=terraform.tfvars
   ```

O `apply` cria a instância, o floating IP e o security group. **A porta admin/SSH é
restrita a `admin_ssh_cidr`** (nunca `0.0.0.0/0`).

---

## 2. Criar o repositório público no GitHub

1. Acesse <https://github.com/new>.
2. Repository name: `travessia-mvp` (ou outro nome).
3. Visibilidade: **Public**.
4. **Não** marque "Add a README file", ".gitignore" ou "license": o projeto já tem esses
   arquivos e o push seria rejeitado.
5. Clique em **Create repository** e copie a URL.

Confirme que o `.env` real **não** será enviado:

```powershell
git status --short
git check-ignore .env
```

```powershell
git add .
git commit -m "feat: MVP Travessia com deploy em VPS"
git remote add origin https://github.com/guicvsub/gs-dev-sec.git
git push -u origin main
```

---

## 3. Configurar secrets e variables no GitHub

O pipeline faz o **deploy automático via SSH**. Configure em
**Settings → Secrets and variables → Actions**:

### Secrets
| Nome | Valor |
| --- | --- |
| `VPS_SSH_KEY` | Conteúdo da **chave privada** SSH (past/pubkey) para acessar a VPS |
| `VPS_USER` | Usuário SSH da VPS (ex.: `ubuntu` ou `root`) |
| `VPS_SSH_PORT` | Porta SSH (padrão `22`; opcional) |

### Variables
| Nome | Valor | Obrigatória? |
| --- | --- | --- |
| `VPS_HOST` | IP público da VPS (ex.: `4.168.236.152`) | Recomendada |
| `VPS_PATH` | Caminho do projeto na VPS (ex.: `~/gs-dev-sec`) | Opcional |

---

## 4. Preparar a VPS (Docker)

Conecte-se à VPS por SSH e instale o Docker:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
```

---

## 5. Enviar o projeto para a VPS

```bash
git clone https://github.com/guicvsub/gs-dev-sec.git
# ou: scp -r gs-dev-sec usuario@IP_DA_VPS:~/gs-dev-sec
```

> O `.env` não está no repositório. Se for usar o núcleo Python opcional, crie o `.env`
> na VPS.

---

## 6. Deploy automático e manual

**Automático (recomendado):** cada `git push` na `main` dispara o pipeline que roda
Gitleaks + Semgrep + Trivy, builda e então executa via SSH:

```bash
cd ~/gs-dev-sec
git pull
docker compose up -d --build web
```

**Manual:** na VPS, rode o `deploy-vps.sh`:

```bash
cd ~/gs-dev-sec
./scripts/deploy-vps.sh
```

Verifique pela URL pública:

```bash
curl -I http://IP_DA_VPS
```

---

## 7. Observabilidade (Prometheus + Grafana locais)

A rubrica pede as **4 métricas de ouro** com um **alerta disparado**. Prometheus + Grafana
podem rodar **localmente** apontando para o MVP publicado:

```bash
docker compose -f docker-compose.observability.yml up -d
# Prometheus: http://localhost:9090   Grafana: http://localhost:3000 (admin/admin)
```

O dashboard **"Travessia - 4 Métricas de Ouro"** já é provisionado e mostra latência,
tráfego, erros e saturação. Alertas em `monitoring/alerts.yml` (`MVPDown`,
`MVPHighLatency`). Para evidenciar o "alerta disparado", derrube/sobrecarregue o MVP ou
use o painel de alertas do Prometheus.

---

## 8. Núcleo Python (opcional)

```bash
docker compose --profile core up -d --build
docker compose logs -f core
```

---

## 9. Problemas comuns

**O container reinicia (crash loop)** → `docker compose logs web`.

**Pipeline falha em "Deploy na VPS via SSH"** → confira os secrets `VPS_SSH_KEY`,
`VPS_USER` e a variable `VPS_HOST`. Teste o acesso SSH manualmente.

**Terraform falha** → confira as variáveis de ambiente do OpenStack e o `admin_ssh_cidr`
(use o seu IP de casa, não `0.0.0.0/0`).

**GitHub Actions falha no Gitleaks/Trivy** → segredo vazado (rotacione e limpe histórico)
ou vulnerabilidade CRITICAL/HIGH na imagem (corrija o Dockerfile/base).

---

## 10. Segurança

- A chave SSH e o usuário da VPS ficam em **GitHub Secrets**; nunca no código.
- O **SSH/porta admin nunca é aberta para `0.0.0.0/0`** (terraform/network.tf).
- **State e `.tfvars` fora do repositório**.
- O container roda como **usuário nginx (UID 101)**, não root.
- Pipeline: Gitleaks + Semgrep + **Trivy** + deploy automático.

**Limitações da atividade:** HTTP sem domínio/HTTPS. Uma evolução é HTTPS (Caddy/Let's
Encrypt) e replicação em múltiplas VPS.