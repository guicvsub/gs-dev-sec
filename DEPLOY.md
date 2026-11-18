# Deploy na VPS — guia de produção

Este guia leva o projeto do zero até o MVP no ar em uma **VPS Linux** (no nosso caso, a
VPS da AIS, Ubuntu 24.04) usando **Docker Compose**. Não depende de nenhum provedor de
nuvem externo — a infraestrutura é a própria VPS.

> **Tempo estimado:** 20 a 40 minutos na primeira vez (instalação do Docker, clone e
> primeiro build).

---

## O que o deploy cria

```text
VPS AIS (Ubuntu 24.04)
 ├── Docker + Docker Compose
 ├── Build da imagem do site (Dockerfile + Nginx unprivileged)
 ├── Container "web" publicado na porta 80 (:8080 interno)
 └── (opcional) perfil "core" para o núcleo Python
```

O site é servido por um Nginx **sem root** na porta 8080 do container, publicada na
porta 80 da VPS. O núcleo Python (`main.py`) **não** é iniciado pelo pipeline; é opcional
e roda em um perfil separado.

Antes do deploy, o pipeline do GitHub Actions executa **Gitleaks** (segredos) e
**Semgrep** (SAST). Se qualquer um falhar, o container não deve ir para produção.

---

## Pré-requisitos

- Uma **VPS** com Ubuntu 24.04, IP público fixo e acesso SSH.
- Conta no GitHub.
- Docker Desktop (opcional, só para testar localmente).
- Git instalado (na sua máquina e na VPS).

---

## 1. Criar o repositório público no GitHub

1. Acesse <https://github.com/new>.
2. Repository name: `travessia-mvp` (ou outro nome).
3. Visibilidade: **Public**.
4. **Não** marque "Add a README file", ".gitignore" ou "license": o projeto já tem esses
   arquivos e o push seria rejeitado.
5. Clique em **Create repository** e copie a URL, por exemplo
   `https://github.com/guicvsub/gs-dev-sec.git`.

Antes de commitar, confirme que o `.env` real **não** será enviado:

```powershell
git status --short
git check-ignore .env
```

O primeiro comando não deve listar `.env`; o segundo deve imprimir `.env`. Se o `.env`
aparecer no `git status`, **pare** e confira o `.gitignore`.

```powershell
git add .
git commit -m "feat: MVP Travessia com deploy em VPS"
git remote add origin https://github.com/guicvsub/gs-dev-sec.git
git push -u origin main
```

---

## 2. Preparar a VPS

Conecte-se à VPS por SSH:

```bash
ssh usuario@IP_DA_VPS
```

Instale o Docker e o Docker Compose (Ubuntu 24.04):

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
```

> Saia e entre de novo para o grupo `docker` ter efeito (ou use `sudo` nos comandos
> seguintes).

---

## 3. Enviar o projeto para a VPS

Na sua máquina:

```bash
git clone https://github.com/guicvsub/gs-dev-sec.git
scp -r gs-dev-sec usuario@IP_DA_VPS:~/gs-dev-sec
```

Ou, se preferir, faça o clone direto na VPS:

```bash
cd ~
git clone https://github.com/guicvsub/gs-dev-sec.git
cd gs-dev-sec
```

> O `.env` não está no repositório. Se for usar o núcleo Python opcional, crie o `.env`
> na VPS:
>
> ```bash
> cp .env.example .env
> # edite o .env e preencha ROBOFLOW_API_KEY (só se for usar o núcleo)
> ```

---

## 4. Subir o MVP

```bash
docker compose up -d --build web
```

Verificações:

```bash
docker compose ps
curl -I http://localhost
docker compose logs web
```

Confirme que o site responde pelo IP público da VPS (da sua máquina):

```bash
curl -I http://IP_DA_VPS
```

Se a porta 80 estiver ocupada na VPS, defina outra porta no `.env`:

```bash
echo "WEB_PORT=8081" >> .env   # por exemplo
```

---

## 5. Atualizar o site após novas mudanças

Depois de um `git push` na `main`, atualize o código na VPS e recrie o container:

```bash
cd ~/gs-dev-sec
git pull
docker compose up -d --build web
```

> Use sempre `--build` quando mudar o `Dockerfile` ou o `nginx.conf`; sem isso o Compose
> reutiliza a imagem antiga em cache.

---

## 6. Núcleo Python (opcional)

O núcleo consome créditos do Roboflow e não é publicado como parte do MVP:

```bash
docker compose --profile core up -d --build
docker compose logs -f core
```

Para parar:

```bash
docker compose stop core
```

---

## 7. Problemas comuns

**O container reinicia (crash loop)**

Veja os logs:

```bash
docker compose logs web
```

Se o Nginx estiver saindo, o problema costuma ser a porta ou a imagem. O Nginx escuta
**8080** dentro do container; o mapeamento é `-p 80:8080`.

**A porta 80 já está em uso na VPS**

Defina outra porta no `.env` (`WEB_PORT`) e mapeie a URL. Ou libere a porta 80 no
firewall da VPS (`ufw allow 80`).

**GitHub Actions falha no Gitleaks**

Ele encontrou um segredo no histórico. **Não desative o gate.** Se for a chave do
Roboflow:

1. Rotacione a chave no painel do Roboflow.
2. Remova o arquivo do histórico com `git filter-repo` (ou recrie o repositório sem o
   arquivo).
3. Rode o pipeline de novo.

**Semgrep falha**

Baixe o artefato `semgrep-sarif` do run, veja a regra e o arquivo. Corrija o código.

---

## 8. Segurança

- O `.env` real fica **fora do Git**; o `.env.example` tem só placeholder.
- O Gitleaks roda no histórico completo; um segredo commitado bloqueia o build.
- O container roda como **usuário nginx (UID 101)**, não root.
- As actions do GitHub são fixadas por **SHA completo**.

**Limitações da atividade:** HTTP sem domínio/HTTPS, porta 80 aberta no firewall, deploy
manual via Docker Compose. Uma evolução é adicionar HTTPS (Caddy/Let's Encrypt) e
automatizar o deploy com SSH na pipeline. O relatório em
[`docs/RELATORIO.md`](docs/RELATORIO.md) discute as evoluções.