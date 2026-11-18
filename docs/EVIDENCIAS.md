# Checklist de evidências — Deploy em VPS

Salve os prints em **`docs/prints/`** com os nomes exatos abaixo. O arquivo
[`relatorio.html`](relatorio.html) carrega essas imagens automaticamente; se alguma
estiver faltando, ele mostra um espaço reservado com o nome do arquivo.

> **Dica:** capture a tela inteira (incluindo a URL do navegador ou o nome do job) e
> evite recortar demais. Risque informações pessoais se necessário.

---

## Antes de começar

- [ ] O workflow **Deploy** terminou verde (jobs `security` e `build`).
- [ ] A URL pública abre o site e o botão **Iniciar** funciona.
- [ ] O container `web` está em execução na VPS.

---

## 1. Pipeline completo — `01-pipeline.png`

**Onde:** GitHub → Actions → workflow **Deploy** → run mais recente.

**O que mostrar:**

- Os dois jobs verdes: `Segurança` (ou `security`) e `Build da imagem`.
- O nome do commit e a branch `main`.

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

## 4. Build da imagem — `04-build.png`

**Onde:** run → job **Build da imagem** → step **Build da imagem do site**.

**O que mostrar:**

- O build concluído com sucesso (a imagem Docker foi gerada).

---

## 5. Site público — `05-site.png`

**Onde:** navegador em `http://4.168.236.152`.

**O que mostrar:**

- A URL na barra de endereço.
- A tela inicial do Travessia.
- Se possível, o vídeo rodando com as caixas de detecção e o aviso acessível
  (clique em **Iniciar** e espere alguns segundos).

> Use uma janela limpa, sem abas pessoais. Se o vídeo não carregar, aguarde; o site usa
> detecções salvas e não depende do Roboflow.

---

## 6. Logs JSON — `06-logs.png`

**Onde:** terminal na VPS, dentro de `~/gs-dev-sec`.

**O que mostrar:**

```bash
docker compose logs --tail 20 web
```

- As linhas JSON com `status: 200` e o campo `request`.

---

## 7. Container na VPS — `07-vps.png`

**Onde:** terminal na VPS, dentro de `~/gs-dev-sec`.

**O que mostrar:**

```bash
docker compose ps
```

- O container `web` com status `running (healthy)` (ou `Up`).

---

## 8. Repositório público — `08-repo.png`

**Onde:** <https://github.com/guicvsub/gs-dev-sec>.

**O que mostrar:**

- A página do repositório com a lista de arquivos (`Dockerfile`,
  `.github/workflows/`, `docker-compose.yml`, `frontend/`).

---

## Checklist final da entrega

- [ ] Repositório **público** no GitHub.
- [ ] `.env` **não** aparece no repositório nem no histórico (confira com Gitleaks).
- [ ] `Dockerfile`, `.github/workflows/*.yml` e `docker-compose.yml` no repositório.
- [ ] URL pública preenchida no `README.md` e no relatório.
- [ ] Nome da equipe e RMs preenchidos.
- [ ] Prints 1–8 salvos em `docs/prints/`.
- [ ] PDF exportado com **links clicáveis** (veja abaixo).

### Como exportar o PDF

1. Abra `docs/relatorio.html` no Chrome ou Edge.
2. Clique em **Imprimir / Salvar PDF** (ou `Ctrl+P`).
3. Destino: **Salvar como PDF**.
4. Marque **Gráficos de plano de fundo** (para as cores das tabelas).
5. Layout: **Retrato**, margens **Padrão**, **Cabeçalhos e rodapés desmarcados**.
6. Salve como `Deploy_VPS_Travessia.pdf` e confira se os links do sumário e das
   referências estão clicáveis.

> O `relatorio.html` usa as imagens de `docs/prints/`; se você exportar antes de salvar
> os prints, os espaços reservados aparecem no PDF.