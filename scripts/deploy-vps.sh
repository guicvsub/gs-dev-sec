#!/usr/bin/env bash
# Deploy do MVP na VPS via Docker Compose.
# Uso: deploy-vps.sh
set -euo pipefail

echo "==> Atualizando o código (git pull)"
git pull

echo "==> Recriando o container do site"
docker compose up -d --build web

echo "==> Confirmando que o site responde"
for _ in $(seq 1 10); do
  if curl -fsS -o /dev/null "http://127.0.0.1/"; then
    echo "==> MVP no ar em http://127.0.0.1/"
    docker compose ps
    exit 0
  fi
  sleep 2
done

echo "ERRO: o container nao respondeu. Ultimos logs:"
docker compose logs --tail 50 web || true
exit 1