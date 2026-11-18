# Checklist de evidências — Deploy Blindado

Salve os prints em **`docs/prints/`** com os nomes exatos abaixo. O arquivo
[`relatorio.html`](relatorio.html) carrega essas imagens automaticamente; se alguma
estiver faltando, ele mostra um espaço reservado com o nome do arquivo.

> **Dica:** capture a tela inteira (incluindo a URL do navegador ou o nome do job) e
> evite recortar demais. Se quiser, risque o e-mail pessoal e o account ID da AWS.

---

## Antes de começar

- [ ] O workflow **Deploy** terminou verde (jobs `security`, `infrastructure` e
      `deploy`).
- [ ] A URL pública abre o site e o botão **Iniciar** funciona.
- [ ] A assinatura do SNS foi confirmada no e-mail.
- [ ] Espere ~5 minutos após o deploy para o CloudWatch ter métricas.

---

## 1. Pipeline completo — `01-pipeline.png`

**Onde:** GitHub → Actions → workflow **Deploy** → run mais recente.

**O que mostrar:**

- Os três jobs verdes: `Segurança` (ou `security`), `Terraform (infra)` e
  `Build e deploy`.
- O nome do commit e a branch `main`.
- Se possível, o resumo do job `deploy` com os links de MVP e dashboard.

**Comando útil (se tiver GitHub CLI):**

```bash
gh run list --workflow=deploy.yml
gh run view <run-id> --log
```

---

## 2. Gitleaks — `02-gitleaks.png`

**Onde:** run → job **Segurança** → subjob **Gitleaks (segredos)** → step
**Procurar segredos no histórico**.

**O que mostrar:**

- A saída do Gitleaks com `no leaks found` (ou a mensagem de sucesso equivalente).
- O comando com `--redact` e `--exit-code 1` (mostra que o gate é real).

> Se o Gitleaks falhar, **não desative**. Veja o procedimento no `DEPLOY.md`
> (rotacionar a chave e limpar o histórico).

---

## 3. Semgrep — `03-semgrep.png`

**Onde:** run → job **Segurança** → subjob **Semgrep (SAST)**.

**O que mostrar:**

- O resumo `Findings: 0 (0 blocking)` ou a lista de achados corrigidos.
- O artefato `semgrep-sarif` publicado no run (role até **Artifacts** e capture também).

> O pipeline usa `p/default` + `p/secrets` e falha com `--error` se houver finding
> bloqueante.

---

## 4. Terraform — `04-terraform.png`

**Onde:** run → job **Terraform (infra)** → step **Terraform apply**.

**O que mostrar:**

- `Apply complete! Resources: N added, 0 changed, 0 destroyed.`
- Preferencialmente, os outputs logo depois (`instance_id`, `public_ip`,
  `ecr_repository_url`).

**Opcional:** capture também o step **Garantir o bucket de state no S3**.

---

## 5. Site público — `05-site.png`

**Onde:** navegador em `http://IP_PUBLICO`.

**O que mostrar:**

- A URL na barra de endereço.
- A tela inicial do Travessia.
- Se possível, o vídeo rodando com as caixas de detecção e o aviso acessível
  (clique em **Iniciar** e espere alguns segundos).

> Use uma janela limpa, sem abas pessoais. Se o vídeo não carregar, aguarde; o site usa
> detecções salvas e não depende do Roboflow.

---

## 6. Dashboard — `06-dashboard.png`

**Onde:** console AWS → CloudWatch → Dashboards → `travessia-mvp`.

**O que mostrar:**

- Os cinco widgets: CPU, erros 5xx, rede, Logs Insights e alarmes.
- O período (últimos 30 min/1 h) e o nome do dashboard.

> O link direto aparece no resumo do job `deploy` e no output `dashboard_url`.

---

## 7. Alerta por e-mail — `07-alarme.png`

**Onde:** caixa de entrada do e-mail configurado em `ALERT_EMAIL`.

**O que mostrar:**

- O e-mail **AWS Notification - Subscription Confirmation** (se ainda não confirmou) e/ou
  o e-mail de alarme do SNS.
- O nome do alarme (`travessia-cpu-high` ou `travessia-http-5xx`) e o estado `ALARM`.

**Como provocar o alerta (CloudShell):**

```bash
aws cloudwatch set-alarm-state \
  --alarm-name travessia-cpu-high \
  --state-value ALARM \
  --state-reason "Teste de alerta do Deploy Blindado" \
  --region us-east-1
```

Depois de capturar, volte para OK:

```bash
aws cloudwatch set-alarm-state \
  --alarm-name travessia-cpu-high \
  --state-value OK \
  --state-reason "Teste concluido" \
  --region us-east-1
```

**Opcional:** capture também o console em **CloudWatch → All alarms** com o alarme em
`ALARM`.

---

## 8. Logs — `08-logs.png`

**Onde:** CloudWatch → Log groups → `/travessia-web` → Logs Insights.

**Consulta sugerida:**

```sql
fields @timestamp, remote_addr, request, status
| sort @timestamp desc
| limit 20
```

**O que mostrar:**

- As linhas JSON com `status: 200` e o campo `request`.
- O nome do log group e o período.

> Para provar o filtro de 5xx, rode `filter status >= 500`; se não houver erros, mostre a
> consulta e explique que o alarme está configurado (print 7).

---

## 9. ECR — `09-ecr.png`

**Onde:** console AWS → ECR → Repositories → `travessia-web`.

**O que mostrar:**

- A imagem com a tag `SHA-RUN_ATTEMPT` (a mesma do resumo do deploy).
- O resultado do **scan on push** (pode levar alguns minutos; “No findings” é ótimo).
- A configuração de **tag immutability** se estiver visível.

---

## 10. Custos — `10-custos.png`

**Onde (uma das opções):**

- AWS Console → Billing and Cost Management → **Cost Explorer** (pode levar 24 h para
  popular; use o período “Month to date”).
- Ou a tabela de custos da seção 8 do [`RELATORIO.md`](RELATORIO.md).
- Ou a [calculadora da AWS](https://calculator.aws/) com os itens do MVP.

**O que mostrar:**

- A estimativa mensal (≈ US$ 13) e os itens EC2, EBS, IPv4, ECR, CloudWatch.
- Se usar o Cost Explorer, mostre o filtro por serviço e o total do mês.

> O print pode ser da tabela do relatório; o importante é justificar o custo.

---

## Checklist final da entrega

- [ ] Repositório **público** no GitHub.
- [ ] `.env` **não** aparece no repositório nem no histórico (confira com Gitleaks).
- [ ] `Dockerfile`, `.github/workflows/*.yml` e `terraform/` estão no repositório.
- [ ] URL pública preenchida no `README.md` e no relatório.
- [ ] Nome da equipe e RMs preenchidos.
- [ ] Link do dashboard preenchido.
- [ ] Prints 1–10 salvos em `docs/prints/`.
- [ ] PDF exportado com **links clicáveis** (veja abaixo).
- [ ] PDF enviado no portal até **19/11, 23h55**.

### Como exportar o PDF

1. Abra `docs/relatorio.html` no Chrome ou Edge.
2. Clique em **Imprimir / Salvar PDF** (ou `Ctrl+P`).
3. Destino: **Salvar como PDF**.
4. Marque **Gráficos de plano de fundo** (para as cores das tabelas).
5. Layout: **Retrato**, margens **Padrão**, **Cabeçalhos e rodapés desmarcados**.
6. Salve como `Deploy_Blindado_Travessia.pdf` e confira se os links do sumário e das
   referências estão clicáveis.

> O `relatorio.html` usa as imagens de `docs/prints/`; se você exportar antes de salvar
> os prints, os espaços reservados aparecem no PDF.
