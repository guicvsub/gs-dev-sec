# Guia — Evidências que exigem screenshot (etapas finais)

Algumas evidências só podem ser capturadas com o pipeline/serviços **rodando** no
GitHub e no navegador. Eu gerei as evidências técnicas (logs reais) acima; para os
PNGs finais, siga este roteiro. Use um print de tela inteira em cada item.

## 01 — Pipeline completo (verde)
**Onde:** GitHub → Actions → workflow **Deploy** → run recente.
**Mostrar:** jobs `security`, `build` e `deploy` todos verdes + o resumo.

## 02 — Gitleaks
Step do job **Segurança** → "Procurar segredos no histórico" com `no leaks found`.

## 03 — Semgrep (barrada + corrigida)
- **Barrada (09):** execução com `Findings: 1 (1 blocking)` (tag móvel do
  `appleboy/ssh-action@v1.2.0`).
- **Corrigida (10):** após fixar o SHA — `Findings: 0`.

## 04 — Trivy
Step **Escanear a imagem com Trivy** com `Total: 0 (HIGH: 0, CRITICAL: 0)`.

## 05 — Site público
Navegador em `http://4.168.236.152` com a URL visível + vídeo/detecções.

## 06 — Dashboard Grafana
http://localhost:3000 (admin/admin) → **"Travessia - 4 Métricas de Ouro"** com as
4 métricas de ouro exibindo dados reais.

## 07 — Alerta disparado
http://localhost:9090/alerts mostrando **MVPDown** ou **MVPHighLatency** em estado
`firing`. Para provocar: pare o container ou aumente a latência; aguarde o
`for: 1m`/`for: 2m` do alerta.

## 08 — IaC
`terraform apply` com `Apply complete! Resources: N added` (security group com
`admin_ssh_cidr` específico).

## 09 e 10 — Barrada e corrigida
Conforme o item 03 (Semgrep), ou use qualquer gate (Trivy/Gitleaks) que tenha
barrado um run e mostre o run seguinte verde após a correção identificada.

---

> **Ordem recomendada:**
> 1. Configure GitHub Secrets (`VPS_SSH_KEY`, `VPS_USER`, `VPS_HOST`) e rode o pipeline.
> 2. Capture 01, 02, 03/09/10, 04.
> 3. Suba `docker-compose.observability.yml`, rode um pouco de tráfego no MVP e
>    capture 06 e 07.
> 4. Capture 05 (navegador) e 08 (terraform apply).
> 5. Exporte o PDF final com os prints em `docs/prints/`.