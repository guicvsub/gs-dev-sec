# Deploy em VPS — Travessia

**FIAP — Global Solution 2026.2 • CitizenTech**
**Secure DevOps Tools & Cloud Computing — Prof. Cleórbete Santos**

> **Antes de exportar o PDF:** confira o nome da equipe, os integrantes/RMs e salve os
> prints em `docs/prints/` com os nomes da seção 9. O arquivo `docs/relatorio.html` já
> está formatado para impressão. Repositório público:
> <https://github.com/guicvsub/gs-dev-sec>.

---

## 1. Identificação

| Campo | Valor |
| --- | --- |
| **Equipe** | GS7 (Global Solution 7) |
| **Integrantes** | Guilherme Santiago da Silva (RM552321), Gustavo Govea Soares (RM553842), Pedro Henrique Mello Silva Alves (RM554223), Gabriel Borba (RM553187) |
| **Repositório público** | <https://github.com/guicvsub/gs-dev-sec> |
| **MVP no ar** | <http://4.168.236.152> |
| **Pipeline** | <https://github.com/guicvsub/gs-dev-sec/actions/workflows/deploy.yml> |
| **Data** | 18 de novembro de 2026 |

---

## 2. Resumo executivo

O **Travessia** é o MVP da CitizenTech para apoiar pessoas cegas ou com baixa visão na
travessia de ruas. Uma câmera vestível filma a via; um modelo de visão computacional
reconhece faixa de pedestre, semáforo e veículos; o resultado é convertido em um aviso
simples em tela, voz e vibração.

Para o deploy seguro, o MVP foi empacotado em uma imagem Docker e publicado em uma **VPS
própria** (AIS, Ubuntu 24.04):

- **Segurança:** Gitleaks (segredos), Semgrep (SAST) e **Trivy** (vulnerabilidades) bloqueiam o pipeline.
- **IaC:** a VPS é provisionada por **Terraform (OpenStack)**; state e `.tfvars` ficam fora do repo; a porta admin nunca abre para `0.0.0.0/0`.
- **Container:** o build do Vite gera os estáticos do site e o Nginx (não-root) os serve.
- **Deploy:** automático via **SSH** (GitHub Actions) com Docker Compose na porta 80.
- **Observabilidade:** **Prometheus + Grafana** locais com as **4 métricas de ouro** e alerta disparado.

O site público é a parte demonstrável do MVP: ele reproduz um vídeo de São Paulo com as
detecções precomputadas, sem depender de chave do Roboflow. O núcleo Python que chama o
Roboflow é opcional e não é iniciado pelo pipeline.

---

## 3. O problema e a solução

### Problema

A travessia de ruas é uma das tarefas mais arriscadas para pessoas com deficiência
visual. Semáforos, faixas e veículos mudam de estado rapidamente, e a bengala ou o cão-guia
não informam a cor do semáforo. A informação existe no ambiente, mas não chega de forma
acessível.

### Solução proposta

Uma câmera ESP32-CAM vestível captura a cena à frente. O núcleo em Python envia frames
ao modelo do Roboflow (classes `pedestrian_crossing`, `green_light`, `red_light` e
`vehicle`), aplica regras de decisão e gera uma mensagem curta, por exemplo:

- "Faixa de pedestre e semáforo verde a frente"
- "Faixa de pedestre e semáforo vermelho a frente"
- "Semáforo vermelho a frente (sem faixa de pedestre)"

No MVP, a câmera é substituída por um vídeo público do YouTube. O site em React mostra o
vídeo com as caixas de detecção e o aviso acessível. A troca do vídeo pela câmera exige
mudar apenas a fonte da imagem; a análise e as regras permanecem.

### Escopo deste repositório

| Parte | O que é | Entra no deploy? |
| --- | --- | --- |
| `frontend/` | Site React + Vite + Tailwind, com detecções salvas | **Sim** (MVP público) |
| `main.py` + `utility/` | Núcleo Python + OpenCV + Roboflow | Não (opcional, headless) |
| `Dockerfile` | Build do site + Nginx unprivileged | Sim |
| `Dockerfile.core` | Imagem do núcleo Python | Opcional, local |

---

## 4. Arquitetura

![Arquitetura do Deploy](arquitetura.svg)

### Componentes

| Camada | Serviço | Configuração |
| --- | --- | --- |
| IaC | Terraform (OpenStack) | Instância, floating IP, security group (só 80 pública) |
| Aplicação | Container Docker `web` | Site em React servido pelo Nginx na 8080 |
| Servidor | VPS AIS (Ubuntu 24.04) | Docker + Docker Compose; IP público fixo |
| Proxy/Web | Nginx unprivileged | Porta 80 externa → 8080 interna |
| CI/CD | GitHub Actions | Gitleaks, Semgrep, Trivy, build e deploy SSH |
| Observabilidade | Prometheus + Grafana (locais) | 4 métricas de ouro + alerta |

### Decisões de arquitetura

1. **Site estático em Nginx:** o MVP não tem back-end; o build do Vite gera arquivos
   estáticos e o Nginx os serve. Isso reduz a superfície de ataque.
2. **Nginx unprivileged:** o container roda como UID 101 (nginx), não root.
3. **VPS dedicada (IaC):** provisionada por Terraform; IP público estável, custo fixo e
   administração simples.
4. **Porta admin restrita:** o security group só expõe a porta 80 ao público; o
   SSH/admin usa um CIDR específico (`admin_ssh_cidr`), nunca `0.0.0.0/0`.

---

## 5. Pipeline DevSecOps

O workflow principal é o [`deploy.yml`](../.github/workflows/deploy.yml). Ele roda em
todo push na `main` e por `workflow_dispatch`.

```text
push na main
  │
  ├─ security ─┬─ Gitleaks (histórico completo, --redact, exit code 1)
  │            ├─ Semgrep  (p/default + p/secrets, SARIF como artefato)
  │            └─ Trivy    (imagem: CRITICAL/HIGH bloqueia, SARIF)
  │
  ├─ build ──── docker build da imagem do site
  │
  └─ deploy ── SSH → VPS → docker compose up -d --build web → curl 200
```

| Etapa | Ferramenta | O que faz | Critério de bloqueio |
| --- | --- | --- | --- |
| 1 | Gitleaks 8.28 | Procura segredos no histórico do Git | Qualquer finding |
| 2 | Semgrep | SAST em Python, JS, Dockerfile e workflows | Finding bloqueante |
| 3 | Trivy | Scan de vulnerabilidades na imagem | CRITICAL/HIGH (não fixadas) |
| 4 | Docker | Build da imagem do site | Falha de build |
| 5 | SSH (deploy) | `git pull` + `docker compose up` na VPS | Comando remoto falha |
| 6 | `curl` | `GET http://IP/` precisa retornar 200 | Status ≠ 200 |

**Controles de segurança do pipeline:**

- O job `build` tem `needs: security`; o `deploy` tem `needs: build`. Se Gitleaks, Semgrep
  ou Trivy falharem, nada é publicado.
- As actions são fixadas pelo **SHA completo** do commit (não por tags móveis).
- Segredos (chave SSH, usuário) estão em **GitHub Secrets**.
- O deploy é **automático** a cada push na `main` e por `workflow_dispatch`.

### Pipeline de pull request

O [`pr.yml`](../.github/workflows/pr.yml) roda em PRs para a `main`: segurança e build da
imagem.

---

## 6. Segurança

### 6.1 Gestão de segredos

- A chave real do Roboflow fica apenas no `.env` local, que está no `.gitignore`.
- A chave SSH (`VPS_SSH_KEY`) e o usuário (`VPS_USER`) da VPS ficam em **GitHub Secrets**.
- O `.env.example` contém somente o placeholder `sua_chave_do_roboflow_aqui`.
- Se um segredo entrar no histórico, o Gitleaks falha; o procedimento é rotacionar a
  chave e limpar o histórico.

### 6.2 Infraestrutura

| Controle | Implementação |
| --- | --- |
| Porta admin | SSH restrito a `admin_ssh_cidr`; **nunca `0.0.0.0/0`** |
| Superfície de rede | Security group só expõe a porta 80 ao público |
| Estado/IaC | State e `.tfvars` do Terraform **fora do repositório** |
| Container | Nginx unprivileged (UID 101) |
| CI/CD | Gitleaks + Semgrep + Trivy; actions fixadas por SHA |

### 6.3 Limitações e evoluções de segurança

- O site é HTTP, sem domínio/HTTPS — evolução: proxy TLS (Caddy/Let's Encrypt).
- O `probe` do `/stub_status` expõe poucas métricas read-only (aceitável). Em produção
  alto tráfego, restringir por IP de monitoramento.

---

## 7. Observabilidade (Prometheus + Grafana)

As **4 métricas de ouro** do MVP são exibidas em Grafana local via Prometheus (a rubrica
permite Prometheus/Grafana locais apontando para o MVP publicado).

### 7.1 Métricas

| Métrica de ouro | Métrica | Fonte |
| --- | --- | --- |
| Latência | `probe_duration_seconds` | blackbox-exporter |
| Tráfego | `rate(nginx_http_requests_total[5m])` | nginx-prometheus-exporter |
| Erros/Disponibilidade | `probe_success` | blackbox-exporter |
| Saturação | `nginx_connections_active` | nginx-prometheus-exporter |

Stack em `docker-compose.observability.yml` (Prometheus, Grafana, blackbox,
nginx-exporter). Dashboard **"Travessia - 4 Métricas de Ouro"** provisionado.

### 7.2 Alertas

`monitoring/alerts.yml` define:

- **MVPDown** (CRITICAL): `probe_success == 0` por 1 min — MVP fora do ar.
- **MVPHighLatency** (WARNING): latência > 3 s por 2 min.

Para evidenciar o "alerta disparado", simule uma falha e capture o alerta no Prometheus.

---

## 8. Custos

O custo é o **valor fixo da VPS AIS** (sem serviços gerenciados de nuvem):

| Item | Estimativa/mês |
| --- | --- |
| VPS AIS (1–2 vCPU, 2–4 GB RAM) | **R$ 40–80** |
| IP público (floating), se cobrado | R$ 0–10 |
| Tráfego de saída (baixa demanda) | ~R$ 0–5 |
| **Total estimado** | **≈ R$ 45–95/mês** |

O núcleo Python opcional consome créditos do Roboflow à parte.

---

## 9. Evidências

Salve os prints em `docs/prints/` com os nomes abaixo. O checklist detalhado está em
[`EVIDENCIAS.md`](EVIDENCIAS.md).

| # | Arquivo | O que deve mostrar |
| --- | --- | --- |
| 1 | `01-pipeline.png` | Run do workflow `Deploy` com os jobs `security`, `build` e `deploy` verdes. |
| 2 | `02-gitleaks.png` | Step do Gitleaks sem findings (ou o log do gate). |
| 3 | `03-semgrep.png` | Step do Semgrep com `0 findings` / artefato SARIF. |
| 4 | `04-trivy.png` | Step do Trivy com `Total: 0` (ou baixo) / artefato SARIF. |
| 5 | `05-site.png` | Site público no navegador, com a URL visível. |
| 6 | `06-dashboard.png` | Dashboard Grafana com as 4 métricas de ouro. |
| 7 | `07-alerta.png` | Alerta disparado (`MVPDown`/`MVPHighLatency`) no Prometheus/Grafana. |
| 8 | `08-iac.png` | `terraform apply` (ou plan) mostrando a criação da VPS/security group. |
| 9 | `09-barrada.png` | Execução barrada do pipeline (Gitleaks/Semgrep/Trivy falhando). |
| 10 | `10-corrigida.png` | Execução corrigida passando de verde. |

---

## 10. Dados pessoais e LGPD

O MVP reproduz um **vídeo público de uma rua de São Paulo**, que pode conter **pessoas
visíveis e placas de veículos**. Tratamento:

| Dado | Onde fica | Observação |
| --- | --- | --- |
| Imagens/vídeo (pessoas) | Vídeo público do YouTube | Não é coletado nem armazenado pela app. |
| Detecções pré-computadas | `frontend/public/dados/deteccoes-video.json` | Apenas bounding boxes e classes, **sem rostos reconhecíveis**. |
| Dados do usuário final | Nenhum | O site **não coleta** nome, e-mail, localização nem qualquer dado pessoal. |

**Responsabilidade compartilhada (modelo provedor/cliente):**

- **Provedor (AIS):** segurança física e da infraestrutura, disponibilidade de rede e do
  datacenter.
- **Cliente (equipe):** a aplicação, o container, as credenciais/secrets, os dados
  processados, as configurações de segurança e o cumprimento da **LGPD** sobre os dados.
- A aplicação é stateless e **não persiste dados pessoais**, minimizando risco à
  privacidade.

---

## 11. Como reproduzir

1. Crie o repositório público e envie o código (sem o `.env` e sem `.tfvars`).
2. **Provisione a VPS com Terraform** (OpenStack): `terraform apply`.
3. Configure os secrets/variables (chave SSH, usuário, host).
4. Faça push na `main`: pipeline roda Gitleaks + Semgrep + Trivy e faz **deploy automático
   via SSH**.
5. Suba o Prometheus + Grafana locais e confirme as 4 métricas e o alerta.

O passo a passo completo está em [`../DEPLOY.md`](../DEPLOY.md).

---

## 12. Conclusão

O MVP atende aos entregáveis:

- **Container e IaC:** Dockerfile enxuto/não-root, Docker Compose e **VPS provisionada por
  Terraform** (state e `.tfvars` fora do repo; porta admin nunca `0.0.0.0/0`).
- **Observabilidade:** **Prometheus + Grafana locais** com as **4 métricas de ouro** e
  **alerta disparado**.
- **Pipeline DevSecOps:** GitHub Actions com build, Gitleaks, Semgrep e **Trivy** a cada
  push, secrets em GitHub Secrets e **deploy automático via SSH**, com execução barrada e
  corrigida evidenciadas.
- **Documentação:** diagrama, responsabilidade compartilhada, LGPD, custo e README
  reproduzível.

O resultado é um MVP no ar de forma reproduzível, seguro na pipeline e com observabilidade
completa — com custo previsível de uma VPS dedicada.

---

## Referências

- [Repositório do projeto](https://github.com/guicvsub/gs-dev-sec)
- [Guia de deploy](../DEPLOY.md)
- [Checklist de evidências](EVIDENCIAS.md)
- [GitHub Actions — reusable workflows](https://docs.github.com/actions/using-workflows/reusing-workflows)