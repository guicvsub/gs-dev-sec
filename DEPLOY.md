# Deploy Blindado — guia de produção na AWS

Este guia leva o projeto do zero até o MVP no ar com **Terraform + GitHub Actions**,
sem SSH e sem instalar AWS CLI ou Terraform na sua máquina. Todo o provisionamento e o
deploy acontecem no GitHub Actions.

> **Tempo estimado:** 20 a 30 minutos na primeira vez (incluindo criação de conta/IAM).
> O primeiro deploy leva ~8 a 12 minutos; os seguintes são mais rápidos.

## O que o pipeline cria

```text
GitHub Actions
 ├── Gitleaks ............... barra segredo vazado
 ├── Semgrep ................ barra vulnerabilidade (SAST)
 ├── Terraform .............. cria VPC, EC2, EIP, ECR, IAM, CloudWatch, SNS e S3
 ├── Docker ................. builda o site e publica a imagem no ECR
 ├── SSM .................... baixa a imagem e sobe o container na EC2 (sem SSH)
 └── curl ................... confirma que a URL pública responde 200
```

O site é servido por um Nginx **sem root** na porta 8080 do container, publicada na
porta 80 da instância. O núcleo Python (`main.py`) **não** é iniciado pelo pipeline.

---

## Pré-requisitos

- Conta AWS com permissão para criar recursos (ideal: uma conta de estudos).
- Conta no GitHub.
- Um e-mail para receber os alertas do CloudWatch.
- Docker Desktop (opcional, só para testar localmente).
- Git instalado (já está neste ambiente).

> **Custo:** a infraestrutura custa aproximadamente **US$ 13/mês** em `us-east-1`
> on-demand (EC2 + disco + IPv4 público + serviços gerenciados). Destrua ao final da
> atividade com o workflow **Destroy**.
>
> Dica: crie um **AWS Budget** de US$ 20 no console (Billing → Budgets) como rede de
> segurança. O orçamento não é criado pelo Terraform.

---

## 1. Criar o repositório público no GitHub

1. Acesse <https://github.com/new>.
2. Repository name: `travessia-mvp` (ou outro nome).
3. Visibilidade: **Public** (a atividade exige repositório público).
4. **Não** marque "Add a README file", ".gitignore" ou "license": o projeto já tem esses
   arquivos e o push seria rejeitado.
5. Clique em **Create repository** e copie a URL, por exemplo
   `https://github.com/guicvsub/travessia-mvp.git`.

O projeto já está com um repositório Git local iniciado na branch `main`. Antes de
commitar, confirme que o `.env` real **não** será enviado:

```powershell
git status --short
git check-ignore .env
```

O primeiro comando não deve listar `.env`; o segundo deve imprimir `.env`. Se o `.env`
aparecer no `git status`, **pare** e confira o `.gitignore`.

```powershell
git add .
git commit -m "feat: MVP Travessia com pipeline DevSecOps"
git remote add origin https://github.com/guicvsub/gs-dev-sec.git
git push -u origin main
```

> Se preferir, crie o commit antes de configurar os secrets, mas **não faça push ainda**.
> O ideal é configurar o IAM e os secrets primeiro (passos 2 e 3) para o primeiro run já
> nascer verde.

---

## 2. Criar o usuário IAM do pipeline

O pipeline precisa de credenciais para criar recursos na AWS. Para a atividade, use um
usuário dedicado com duas políticas gerenciadas:

1. No console AWS, abra **IAM → Users → Create user**.
2. Nome: `travessia-ci`.
3. **Não** habilite acesso ao console (o pipeline só usa API).
4. Em **Set permissions**, escolha **Attach policies directly** e marque:
   - `PowerUserAccess` — cria VPC, EC2, ECR, CloudWatch, SNS, S3 etc.
   - `IAMFullAccess` — necessária para o Terraform criar a role da instância.
5. Crie o usuário.
6. Abra o usuário → aba **Security credentials** → **Create access key**.
7. Escolha **Application running outside AWS** → **Create access key**.
8. Copie o **Access key ID** e o **Secret access key** (o secret só aparece uma vez).

> **Por que IAMFullAccess?** O Terraform cria a role `travessia-ec2-role`, o instance
> profile e as políticas anexadas. Em produção, o correto é usar **OIDC** entre GitHub
> Actions e AWS, com uma role de menor privilégio e sem access keys. Para a atividade,
> as duas políticas gerenciadas mantêm o setup simples.
>
> **Nunca** coloque essas chaves no código, no `.env` ou no README. Elas vão apenas para
> os **GitHub Secrets**.

---

## 3. Configurar secrets e variables no GitHub

No repositório: **Settings → Secrets and variables → Actions**.

### Secrets (aba Secrets)

| Nome | Valor |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | Access key ID do usuário `travessia-ci` |
| `AWS_SECRET_ACCESS_KEY` | Secret access key do usuário `travessia-ci` |

### Variables (aba Variables)

| Nome | Valor | Obrigatória? |
| --- | --- | --- |
| `AWS_REGION` | `us-east-1` (ou `sa-east-1`) | Recomendada (padrão: `us-east-1`) |
| `ALERT_EMAIL` | seu e-mail para receber os alertas | Sim, para ter o alerta |
| `TF_STATE_BUCKET` | nome alternativo do bucket de state | Opcional |

> O bucket de state é criado automaticamente pelo workflow com o nome
> `travessia-tfstate-<account-id>`. Só defina `TF_STATE_BUCKET` se esse nome já estiver
> em uso (raro, porque o account ID é único).

---

## 4. Rodar o primeiro deploy

Com os secrets configurados, faça o push (ou, se já fez, vá em **Actions → Deploy →
Run workflow**).

O workflow executa, nesta ordem:

1. **security** — Gitleaks e Semgrep. Se qualquer um falhar, o deploy nem começa.
2. **infrastructure** — cria o bucket de state, roda `terraform init/apply` e captura
   `instance_id`, `public_ip`, `public_url`, `ecr_repository_url`, `dashboard_url` e
   `log_group_name`.
3. **deploy** — builda a imagem, publica no ECR, espera o SSM Agent, executa o script
   de deploy na instância e valida `GET http://IP/ == 200`.

Acompanhe em **Actions → Deploy → último run**. O resumo do job **deploy** mostra os
links:

- **MVP:** `http://<ip-publico>/`
- **Dashboard:** link direto para o CloudWatch
- **Imagem:** URI no ECR com a tag do commit
- **Logs:** nome do log group

> Se o primeiro run falhar em `configure-aws-credentials`, confira os nomes dos secrets.
> Se falhar em `terraform apply`, leia a mensagem no log (permissões IAM, região ou
> bucket com nome já usado). Corrija e rode de novo; o Terraform é idempotente.

---

## 5. Confirmar o alerta por e-mail (SNS)

O Terraform cria o tópico `travessia-alerts` e uma assinatura de e-mail em estado
`PendingConfirmation`. **O alerta só chega depois de confirmar:**

1. Abra a caixa de entrada do e-mail configurado em `ALERT_EMAIL` (e o spam).
2. Procure o e-mail **AWS Notification - Subscription Confirmation**.
3. Clique em **Confirm subscription**.

Para testar o caminho completo do alerta (opcional, mas ótimo para a evidência):

1. Abra o **AWS CloudShell** (ícone de terminal no console).
2. Rode:
   ```bash
   aws cloudwatch set-alarm-state \
     --alarm-name travessia-cpu-high \
     --state-value ALARM \
     --state-reason "Teste de alerta do Deploy Blindado" \
     --region us-east-1
   ```
3. Espere o e-mail do SNS e tire um print da caixa de entrada.
4. Volte o alarme para OK:
   ```bash
   aws cloudwatch set-alarm-state \
     --alarm-name travessia-cpu-high \
     --state-value OK \
     --state-reason "Teste concluido" \
     --region us-east-1
   ```

> O comando acima **força** o estado do alarme; ele não espera a métrica. É a forma mais
> rápida de provar que o SNS entrega o e-mail. O próximo ciclo de avaliação do CloudWatch
> volta o alarme para o estado real.

---

## 6. Onde encontrar as URLs e os recursos

| O que | Onde |
| --- | --- |
| URL do MVP | Resumo do job `deploy` ou EC2 → Instances → `travessia-web` → Public IPv4 |
| Dashboard | CloudWatch → Dashboards → `travessia-mvp` (link no resumo) |
| Logs | CloudWatch → Log groups → `travessia-web` |
| Alarmes | CloudWatch → All alarms → `travessia-http-5xx`, `travessia-cpu-high`, `travessia-status-check` |
| Imagem | ECR → Repositories → `travessia-web` |
| State | S3 → `travessia-tfstate-<account-id>` |
| Acesso à instância | EC2 → Instance → Connect → Session Manager (sem SSH) |

### Acesso administrativo sem SSH

No console: **EC2 → Instances → travessia-web → Connect → Session Manager → Connect**.
Ou, com AWS CLI:

```bash
aws ssm start-session --target <instance-id> --region us-east-1
```

Dentro da instância:

```bash
sudo docker ps
sudo docker logs --tail 100 travessia-web
sudo docker inspect --format '{{.State.Health.Status}}' travessia-web
```

---

## 7. Destruir a infraestrutura

Ao terminar a atividade (depois de tirar todos os prints):

1. Vá em **Actions → Destroy → Run workflow**.
2. Digite `destroy` no campo de confirmação e execute.
3. O workflow roda `terraform destroy` e **mantém** o bucket de state.

O site sai do ar, a EC2 e o EIP são removidos, e as imagens do ECR e os logs/alarmes são
apagados. Para remover também o bucket de state:

1. S3 → `travessia-tfstate-<account-id>` → **Empty** → **Delete**.
2. Ou, no CloudShell:
   ```bash
   aws s3 rm s3://travessia-tfstate-SUA_CONTA --recursive
   aws s3 rb s3://travessia-tfstate-SUA_CONTA
   ```

> **Atenção:** o `terraform destroy` remove o EIP; o IP público não será o mesmo se você
> criar tudo de novo. Atualize a URL no README/relatório depois de um novo deploy.

---

## 8. Rodar localmente (Docker)

O site pode ser testado na sua máquina antes do deploy:

```powershell
docker compose up -d --build web
```

Abra <http://localhost>. Se a porta 80 estiver ocupada:

```powershell
$env:WEB_PORT="8085"; docker compose up -d --build web
# abra http://localhost:8085
```

Verificações:

```powershell
docker compose ps
curl.exe -I http://localhost
docker compose logs web
docker compose down
```

> Use `--build` sempre que mudar o Dockerfile ou o `nginx.conf`. Sem isso, o Compose pode
> reutilizar uma imagem antiga em cache.

### Núcleo Python (opcional)

O núcleo não é publicado e consome créditos do Roboflow:

```powershell
Copy-Item .env.example .env
# edite o .env e preencha ROBOFLOW_API_KEY
docker compose --profile core up -d --build
docker compose logs -f core
```

Para parar:

```powershell
docker compose stop core
```

Se o YouTube bloquear o vídeo no IP da AWS, use uma URL direta `.mp4` em `VIDEO_URL`.
O site continua funcionando normalmente.

---

## 9. Problemas comuns

**O workflow falha em `Aguardar o SSM Agent`**

A instância pode levar alguns minutos para registrar. O job espera 5 minutos. Se falhar:

- Confira se a instância `travessia-web` está `running` no console.
- Confira se a role `travessia-ec2-role` está anexada à instância.
- Rode o workflow novamente (o Terraform não recria o que já existe).

**O deploy falha no `docker pull`**

Abra o log do comando SSM no job. Causas comuns:

- A imagem não foi publicada no ECR (veja o job de build).
- A role da instância não tem `AmazonEC2ContainerRegistryReadOnly`.
- O log group `travessia-web` não existe ou a role não tem permissão de logs.

**A URL não responde (000/502/504)**

Use o Session Manager e veja o container:

```bash
sudo docker ps -a
sudo docker logs --tail 100 travessia-web
```

Se o container estiver reiniciando, o problema costuma ser a imagem ou a porta. O Nginx
escuta **8080** dentro do container; o mapeamento é `-p 80:8080`.

**Terraform falha com `BucketAlreadyExists` ou `AccessDenied`**

- O nome do bucket de state pode já existir em outra conta. Defina a variable
  `TF_STATE_BUCKET` com um nome único e rode de novo.
- O usuário IAM precisa de `PowerUserAccess` + `IAMFullAccess`.
- Confira se a região configurada existe e se o `t3.micro` está disponível.

**Gitleaks falha**

Ele encontrou um segredo no histórico. **Não desative o gate.** Se for a chave do
Roboflow:

1. Rotacione a chave no painel do Roboflow.
2. Remova o arquivo do histórico com `git filter-repo` (ou recrie o repositório sem o
   arquivo).
3. Rode o pipeline de novo.

**Semgrep falha**

Baixe o artefato `semgrep-sarif` do run, veja a regra e o arquivo. Corrija o código ou
documente uma exceção justificada com `# nosemgrep: <regra>` (como fizemos no log group,
que já é criptografado pela AWS por padrão).

**O e-mail de alerta não chega**

- SNS → Topics → `travessia-alerts` → Subscriptions: confirme a assinatura.
- Veja spam/lixo eletrônico.
- O alarme precisa estar em `ALARM`; use o teste do passo 5.

**Custos inesperados**

- Use o workflow **Destroy** ao final.
- Confira o **Billing → Cost Explorer**.
- O IPv4 público e o EBS continuam cobrando enquanto existirem, mesmo com a EC2 parada.

---

## 10. Segurança

- O `.env` real fica **fora do Git**; o `.env.example` tem só placeholder.
- O Gitleaks roda no histórico completo; um segredo commitado bloqueia o deploy.
- A instância não tem SSH nem key pair: o acesso é via **SSM Session Manager**.
- O security group só aceita **80/tcp** de entrada.
- O EBS é **criptografado** e o IMDSv2 é obrigatório.
- O ECR é **imutável** e tem **scan on push**.
- As actions do GitHub são fixadas por **SHA completo**.
- O container roda como **usuário nginx (UID 101)**, não root.

**Limitações da atividade:** HTTP sem domínio/HTTPS, uma única instância/AZ, IAM com
políticas amplas e access keys de longa duração. O relatório em
[`docs/RELATORIO.md`](RELATORIO.md) discute as evoluções (OIDC, CloudFront/ACM, ALB,
multi-AZ e backup).
