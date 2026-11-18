# Checklist de evidências — Deploy em VPS com IaC e Observabilidade

Salve os prints em **`docs/prints/`** com os nomes exatos abaixo. O arquivo
[`relatorio.html`](relatorio.html) carrega essas imagens; se alguma estiver faltando, ele
mostra um espaço reservado com o nome do arquivo.

> **Dica:** capture a tela inteira (incluindo a URL do navegador ou o nome do job) e
> evite recortar demais. Risque informações pessoais (endereço, credenciais) se necessário.

---

## Antes de começar

- [ ] Pipeline `Deploy` terminou verde (jobs `security`, `build` e `deploy`).
- [ ] URL pública abre o site e o botão **Iniciar** funciona.
- [ ] Container `web` em execução na VPS.
- [ ] Prometheus + Grafana locais no ar.
- [ ] Terraform `apply` criou a VPS.

---

## 1. Pipeline completo — `01-pipeline.png`

**Onde:** GitHub → Actions → workflow **Deploy** → run mais recente.
**Mostrar:** os três jobs (`security`, `build`, `deploy`) verdes e o resumo.

```bash
gh run list --workflow=deploy.yml
gh run view <run-id> --log
```

---

## 2. Gitleaks — `02-gitleaks.png`

**Onde:** run → job **Segurança** → **Gitleaks (segredos)** → **Procurar segredos**.
**Mostrar:** saída com `no leaks found` e as flags `--redact` + `--exit-code 1`.

> Se falhar, **não desative** — rotacione a chave e limpe o histórico (DEPLOY.md).

---

## 3. Semgrep — `03-semgrep.png`

**Onde:** job **Segurança** → **Semgrep (SAST)**.
**Mostrar:** `Findings: 0 (0 blocking)` e/ou o artefato `semgrep-sarif`.

---

## 4. Trivy — `04-trivy.png`

**Onde:** run → job **Segurança** → **Trivy**.
**Mostrar:** `Total: 0` (ou lista baixa) e/ou o artefato `trivy-sarif`.

---

## 5. Site público — `05-site.png`

**Onde:** navegador em `http://4.168.236.152`.
**Mostrar:** URL na barra + tela inicial do Travessia (clique **Iniciar** e aguarde).

---

## 6. Dashboard Grafana — `06-dashboard.png`

**Onde:** <http://localhost:3000> (Grafana local, admin/admin) → dashboard
**"Travessia - 4 Métricas de Ouro"**.
**Mostrar:** os 4 painéis (latência, tráfego, erros, saturação) com dados reais.

---

## 7. Alerta disparado — `07-alerta.png`

**Onde:** Prometheus <http://localhost:9090/alerts> ou Grafana.
**Mostrar:** o alerta em estado `firing`/`pending` (`MVPDown` ou `MVPHighLatency`).

Para provocar: derrube temporariamente o MVP ou aumente a latência; depois reative.

---

## 8. IaC — `08-iac.png`

**Onde:** terminal com o repositório `terraform/`.
**Mostrar:** `terraform apply` com `Apply complete! Resources: N added`, incluindo a
instância e o security group. Destaque que `admin_ssh_cidr` é um IP específico (não
`0.0.0.0/0`).

---

## 9. Execução barrada — `09-barrada.png`

**Onde:** GitHub Actions, um run antigo/forçado.
**Mostrar:** o pipeline em vermelho — ex.: Gitleaks encontrando um segredo, Semgrep com
finding ou Trivy com CRITICAL/HIGH. Deve ficar claro o **motivo da barreira**.

---

## 10. Execução corrigida — `10-corrigida.png`

**Onde:** GitHub Actions, run seguinte.
**Mostrar:** o **mesmo** ponto que havia falhado agora passando de verde (após correção).

---

## Checklist final da entrega

- [ ] Repositório **público** no GitHub.
- [ ] `terraform/` com state e `.tfvars` **fora** do repo (`.gitignore`).
- [ ] Observabilidade com **4 métricas de ouro** e **alerta disparado**.
- [ ] Pipeline: **build, Gitleaks, Semgrep e Trivy** a cada push; **deploy automático via
      SSH**; secrets em GitHub Secrets.
- [ ] Print de execução **barrada** e **corrigida**.
- [ ] Diagrama, responsabilidade compartilhada, **LGPD**, custo e README reproduzível.
- [ ] Prints 1–10 salvos em `docs/prints/`.
- [ ] PDF exportado com links clicáveis (veja abaixo).

### Como exportar o PDF

1. Abra `docs/relatorio.html` no Chrome/Edge.
2. **Imprimir / Salvar PDF** (Ctrl+P) → Destino **Salvar como PDF**.
3. Marque **Gráficos de plano de fundo**.
4. Layout **Retrato**, margens **Padrão**, cabeçalhos/rodapés desmarcados.
5. Salve como `Deploy_VPS_Travessia.pdf` e confira os links.