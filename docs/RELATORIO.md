# Deploy Blindado — Travessia

**FIAP — Global Solution 2026.2 • CitizenTech**
**Secure DevOps Tools & Cloud Computing — Prof. Cleórbete Santos**

> **Antes de exportar o PDF:** substitua `SEU_USUARIO`, `SEU_REPO`, `IP_PUBLICO` e os
> campos `[PREENCHER]` pelos dados reais. Salve os prints em `docs/prints/` com os nomes
> da seção 9. O arquivo `docs/relatorio.html` já está formatado para impressão.

---

## 1. Identificação

| Campo | Valor |
| --- | --- |
| **Equipe** | `[PREENCHER: nome da equipe]` |
| **Integrantes** | `[PREENCHER: Nome — RM]`, `[PREENCHER]`, `[PREENCHER]` |
| **Repositório público** | <https://github.com/SEU_USUARIO/SEU_REPO> |
| **MVP no ar** | <http://IP_PUBLICO> |
| **Pipeline** | <https://github.com/SEU_USUARIO/SEU_REPO/actions/workflows/deploy.yml> |
| **Dashboard** | `[PREENCHER: link do dashboard, disponível no resumo do deploy]` |
| **Data** | 18 de novembro de 2026 |

---

## 2. Resumo executivo

O **Travessia** é o MVP da CitizenTech para apoiar pessoas cegas ou com baixa visão na
travessia de ruas. Uma câmera vestível filma a via; um modelo de visão computacional
reconhece faixa de pedestre, semáforo e veículos; o resultado é convertido em um aviso
simples em tela, voz e vibração.

Para o **Deploy Blindado**, o MVP foi empacotado em uma imagem Docker e publicado na AWS
por um pipeline de ponta a ponta:

- **Segurança:** Gitleaks (segredos) e Semgrep (SAST) bloqueiam o deploy.
- **Infraestrutura como código:** Terraform cria VPC, EC2, EIP, ECR, IAM, CloudWatch,
  SNS e o backend de state no S3.
- **Deploy automático:** GitHub Actions builda a imagem, publica no ECR e executa o
  deploy na instância via **AWS Systems Manager (SSM)**, sem SSH.
- **Observabilidade:** logs JSON no CloudWatch, dashboard, três alarmes e alerta por
  e-mail via SNS.
- **Custo:** aproximadamente **US$ 13/mês** em `us-east-1` on-demand.

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

- “Faixa de pedestre e semáforo verde a frente”
- “Faixa de pedestre e semáforo vermelho a frente”
- “Semáforo vermelho a frente (sem faixa de pedestre)”

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

![Arquitetura do Deploy Blindado](arquitetura.svg)

### Componentes

| Camada | Serviço | Configuração |
| --- | --- | --- |
| Rede | VPC + subnet pública + Internet Gateway | `10.20.0.0/16`, subnet `10.20.1.0/24` |
| Computação | EC2 `t3.micro` | Ubuntu 24.04, Docker, Nginx não-root na 8080 |
| Acesso público | Elastic IP | HTTP 80; sem SSH; security group só com 80/tcp |
| Registry | Amazon ECR | Repositório `travessia-web`, tags imutáveis, scan on push |
| Administração | SSM Session Manager | IAM role com `AmazonSSMManagedInstanceCore` |
| Observabilidade | CloudWatch + SNS | Logs JSON, dashboard, métricas e alarmes |
| Estado | S3 | Versionado, criptografado, acesso público bloqueado, lock nativo |
| CI/CD | GitHub Actions | Gitleaks, Semgrep, Terraform, Docker e SSM |

### Decisões de arquitetura

1. **Site estático em Nginx:** o MVP não tem back-end; o build do Vite gera arquivos
   estáticos e o Nginx os serve. Isso reduz a superfície de ataque e o custo.
2. **Nginx unprivileged:** o container roda como UID 101 (nginx), não root.
3. **Sem SSH:** a instância não tem key pair nem porta 22. O acesso é via SSM, que usa
   a role da instância e não exige chave.
4. **Elastic IP:** mantém a URL pública estável mesmo se a instância for substituída.
5. **ECR imutável:** uma tag publicada não pode ser sobrescrita; o deploy usa o SHA do
   commit + tentativa do run.
6. **State remoto:** o Terraform guarda o state no S3 e usa o lock nativo (`use_lockfile`),
   sem DynamoDB.

---

## 5. Pipeline DevSecOps

O workflow principal é o [`deploy.yml`](../.github/workflows/deploy.yml). Ele roda em
todo push na `main` e por `workflow_dispatch`.

```text
push na main
  │
  ├─ security ─┬─ Gitleaks (histórico completo, --redact, exit code 1)
  │            └─ Semgrep  (p/default + p/secrets, SARIF como artefato)
  │
  ├─ infrastructure ── Terraform init/apply (state no S3)
  │
  └─ deploy ─── build → ECR → SSM → healthcheck → curl 200
```

| Etapa | Ferramenta | O que faz | Critério de bloqueio |
| --- | --- | --- | --- |
| 1 | Gitleaks 8.28 | Procura segredos no histórico do Git | Qualquer finding |
| 2 | Semgrep | SAST em Python, JS, Terraform, Dockerfile e workflows | Finding bloqueante |
| 3 | Terraform 1.10.5 | `fmt`, `validate` e `apply` | Erro de sintaxe, plano ou apply |
| 4 | Docker | Build da imagem do site | Falha de build |
| 5 | Amazon ECR | Push da imagem com tag única | Falha de autenticação/push |
| 6 | AWS SSM | Pull, troca do container, healthcheck local | Comando remoto falha |
| 7 | `curl` | `GET http://IP/` precisa retornar 200 | Qualquer status ≠ 200 |

**Controles de segurança do pipeline:**

- O job `deploy` tem `needs: security`; se Gitleaks ou Semgrep falharem, ele não roda.
- As actions são fixadas pelo **SHA completo** do commit (não por tags móveis).
- O Gitleaks usa `--redact` para não imprimir o segredo no log.
- O Semgrep publica o SARIF como artefato para auditoria.
- O deploy não usa chave SSH: o comando é enviado pelo SSM e executado como root na
  instância, com o script `scripts/deploy-remote.sh`.
- O script espera o `cloud-init` terminar antes de instalar o container, evitando corrida
  com a instalação do Docker.

### Pipeline de pull request

O [`pr.yml`](../.github/workflows/pr.yml) roda em PRs para a `main`: segurança, build da
imagem e `terraform fmt -check` + `terraform validate` (sem apply). Isso impede que uma
mudança quebre a infraestrutura antes do merge.

### Destruição

O [`destroy.yml`](../.github/workflows/destroy.yml) é manual e exige digitar `destroy`.
Ele executa `terraform destroy` e mantém o bucket de state.

---

## 6. Segurança

### 6.1 Gestão de segredos

- A chave real do Roboflow fica apenas no `.env` local, que está no `.gitignore` e no
  `.dockerignore`.
- O `.env.example` contém somente o placeholder `sua_chave_do_roboflow_aqui`, permitido
  explicitamente no `.gitleaks.toml`.
- O pipeline usa secrets do GitHub para as chaves AWS; nenhuma credencial é escrita no
  repositório.
- Se um segredo entrar no histórico, o Gitleaks falha. O procedimento é rotacionar a
  chave e limpar o histórico, nunca desativar o gate.

### 6.2 Infraestrutura

| Controle | Implementação |
| --- | --- |
| Superfície de rede | Security group só com 80/tcp de entrada; SSH ausente |
| Acesso administrativo | SSM Session Manager + IAM role |
| Metadata | IMDSv2 obrigatório (`http_tokens = "required"`, hop limit 1) |
| Disco | EBS gp3 criptografado |
| Registry | ECR com tags imutáveis e scan on push |
| Container | Nginx unprivileged (UID 101), healthcheck |
| IAM | Role da instância com SSM + ECR read + logs; sem access keys na instância |
| State | S3 versionado, criptografado, com bloqueio de acesso público |

### 6.3 Exceção documentada no Semgrep

O log group do CloudWatch usa a criptografia em repouso **padrão da AWS**
(`aws/logs`), que já é habilitada sem custo. O Semgrep recomenda uma CMK dedicada; para
manter o custo e a complexidade baixos neste MVP, a regra foi suprimida com
`# nosemgrep` e a justificativa está no `terraform/observability.tf`. Em produção, a
evolução é criar uma `aws_kms_key` com política para o serviço de logs.

### 6.4 Limitações de segurança da atividade

- O usuário IAM do pipeline usa `PowerUserAccess` + `IAMFullAccess` e access keys de
  longa duração. O recomendado em produção é **OIDC** com role de menor privilégio.
- O site é HTTP, sem domínio, WAF ou HTTPS. A evolução é CloudFront + ACM.
- O ECR tem scan on push, mas o pipeline não bloqueia por findings do scan; os gates
  obrigatórios são Gitleaks e Semgrep.

---

## 7. Observabilidade

### 7.1 Logs

O Nginx grava access logs em JSON no stdout:

```json
{"time":"2026-11-18T20:59:20+00:00","remote_addr":"172.21.0.1","request":"GET / HTTP/1.1","status":200,"bytes":1002,"referer":"","user_agent":"curl/8.22.0"}
```

O container usa o driver `awslogs` para enviar ao log group `travessia-web`
(retenção de 14 dias). O formato JSON permite filtrar por `status`, `request` e
`remote_addr` no Logs Insights.

### 7.2 Métrica e alarmes

| Alarme | Métrica | Condição | Ação |
| --- | --- | --- | --- |
| `travessia-http-5xx` | `Travessia/Web Http5xx` (metric filter) | Soma ≥ 1 em 5 min | SNS |
| `travessia-cpu-high` | `AWS/EC2 CPUUtilization` | Média > 80% por 10 min | SNS |
| `travessia-status-check` | `AWS/EC2 StatusCheckFailed` | Máximo ≥ 1 por 5 min | SNS |

O metric filter usa o padrão `{ $.status >= 500 }`; o alarme de 5xx tem
`treat_missing_data = notBreaching` e envia também o retorno a OK.

### 7.3 Dashboard

O dashboard `travessia-mvp` tem cinco widgets:

1. CPU da instância.
2. Erros HTTP 5xx (metric filter).
3. Rede (NetworkIn/NetworkOut).
4. Logs Insights com os últimos erros 5xx.
5. Estado dos três alarmes.

### 7.4 Alerta por e-mail

O tópico SNS `travessia-alerts` recebe as ações dos alarmes. A assinatura de e-mail é
criada pelo Terraform e precisa ser confirmada no primeiro deploy. O teste do caminho
completo pode ser feito com `aws cloudwatch set-alarm-state` (veja o `DEPLOY.md`).

---

## 8. Custos

Estimativa para `us-east-1`, preço on-demand, 730 h/mês, em novembro de 2026.
Valores de referência; confirme na [calculadora da AWS](https://calculator.aws/).

| Item | Quantidade | Preço unitário | US$/mês |
| --- | ---: | ---: | ---: |
| EC2 `t3.micro` | 730 h | US$ 0,0104/h | 7,59 |
| EBS gp3 | 20 GB | US$ 0,08/GB-mês | 1,60 |
| IPv4 público (EIP) | 730 h | US$ 0,005/h | 3,65 |
| ECR | ~0,1 GB + requests | US$ 0,10/GB-mês | 0,02 |
| CloudWatch Logs | ~0,5 GB | US$ 0,50/GB ingestão | 0,10 |
| S3 (state) + SNS | < 1 MB + e-mails | — | 0,00 |
| **Total** | | | **≈ 12,96** |

**Premissas e observações:**

- Não considera Free Tier nem créditos promocionais; com eles, o valor pode ser menor.
- O IPv4 público é cobrado por hora, mesmo com a instância parada.
- O EBS continua cobrando enquanto o volume existir.
- O ECR e o CloudWatch têm consumo pequeno para um MVP, mas crescem com o tráfego.
- Para encerrar a cobrança, rode o workflow **Destroy** e exclua o bucket de state.

---

## 9. Evidências

Salve os prints em `docs/prints/` com os nomes abaixo. O checklist detalhado está em
[`EVIDENCIAS.md`](EVIDENCIAS.md).

| # | Arquivo | O que deve mostrar |
| --- | --- | --- |
| 1 | `01-pipeline.png` | Run do workflow `Deploy` com os jobs `security`, `infrastructure` e `deploy` verdes. |
| 2 | `02-gitleaks.png` | Step do Gitleaks sem findings (ou o log do gate). |
| 3 | `03-semgrep.png` | Step do Semgrep com `0 findings` / artefato SARIF. |
| 4 | `04-terraform.png` | `terraform apply` com `Apply complete!` e os recursos criados. |
| 5 | `05-site.png` | Site público no navegador, com a URL visível. |
| 6 | `06-dashboard.png` | Dashboard `travessia-mvp` com os widgets. |
| 7 | `07-alarme.png` | E-mail do SNS e/ou alarme em estado `ALARM`. |
| 8 | `08-logs.png` | Logs JSON no CloudWatch / consulta no Logs Insights. |
| 9 | `09-ecr.png` | Repositório ECR com a imagem e o scan. |
| 10 | `10-custos.png` | Cost Explorer ou a tabela de custos do relatório. |

---

## 10. Como reproduzir

1. Crie o repositório público e envie o código (sem o `.env`).
2. Crie o usuário IAM `travessia-ci` com `PowerUserAccess` + `IAMFullAccess`.
3. Configure os secrets `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` e as variables
   `AWS_REGION` e `ALERT_EMAIL`.
4. Rode o workflow **Deploy**.
5. Confirme a assinatura do SNS e abra a URL do resumo.
6. Para destruir: **Destroy** → digite `destroy`.

O passo a passo completo está em [`../DEPLOY.md`](../DEPLOY.md).

---

## 11. Limitações e próximos passos

| Limitação | Evolução sugerida |
| --- | --- |
| HTTP sem domínio/HTTPS | CloudFront + ACM, ou Caddy com Let's Encrypt |
| Uma instância em uma AZ | ALB + Auto Scaling + multi-AZ |
| IAM com políticas amplas e access keys | OIDC + role de menor privilégio |
| Sem WAF | AWS WAF na distribuição |
| ECR scan não bloqueia | Gate com Inspector/ECR scan no pipeline |
| Sem backup | AWS Backup ou snapshot automatizado do EBS |
| Log group com chave gerenciada | CMK dedicada no KMS |
| Custo fixo de IPv4/EBS | Desligar/destruir fora das demonstrações |

---

## 12. Conclusão

O MVP atende aos entregáveis do **Deploy Blindado**:

- **Repositório público** com `Dockerfile`, workflow e Terraform.
- **URL pública** do MVP na AWS.
- **Pipeline de ponta a ponta**: build, Gitleaks, Semgrep, Terraform, deploy automático
  via SSM e verificação HTTP.
- **Observabilidade** com logs JSON, dashboard, alarmes e alerta por e-mail.
- **Ficha Técnica** no `README.md` e **relatório com arquitetura, evidências e custo**
  neste documento/PDF.

O resultado é uma entrega reproduzível: qualquer pessoa com acesso ao repositório e às
credenciais pode recriar a infraestrutura e publicar o MVP sem clicar em um botão de
deploy manual.

---

## Referências

- [Repositório do projeto](https://github.com/SEU_USUARIO/SEU_REPO)
- [Guia de deploy](../DEPLOY.md)
- [Checklist de evidências](EVIDENCIAS.md)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GitHub Actions — reusable workflows](https://docs.github.com/actions/using-workflows/reusing-workflows)
- [AWS CloudWatch Logs — metric filters](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html)
- [AWS Systems Manager — Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
