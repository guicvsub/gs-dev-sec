#!/usr/bin/env bash
# Executado na instância EC2 via AWS Systems Manager (SSM).
# Uso: deploy-remote.sh <imagem:tag> [regiao] [log-group]
set -euo pipefail

IMAGE_URI="${1:?uso: deploy-remote.sh <imagem:tag> [regiao] [log-group]}"
REGION="${2:-us-east-1}"
LOG_GROUP="${3:-travessia-web}"
CONTAINER_NAME="travessia-web"

REGISTRY="${IMAGE_URI%%/*}"

# O Terraform pode liberar o SSM antes do user_data terminar de instalar o Docker.
echo "==> Aguardando o cloud-init terminar"
cloud-init status --wait || true

echo "==> Login no ECR ($REGISTRY)"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Baixando a imagem $IMAGE_URI"
docker pull "$IMAGE_URI"

echo "==> Substituindo o container $CONTAINER_NAME"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 80:8080 \
  --log-driver awslogs \
  --log-opt awslogs-region="$REGION" \
  --log-opt awslogs-group="$LOG_GROUP" \
  --log-opt awslogs-stream="web" \
  "$IMAGE_URI"

echo "==> Aguardando o site responder"
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1/"; then
    echo "==> Container no ar em http://127.0.0.1/"
    docker ps --filter "name=$CONTAINER_NAME"
    docker image prune -f --filter "until=168h" >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 2
done

echo "ERRO: o container nao respondeu. Ultimos logs:"
docker logs --tail 50 "$CONTAINER_NAME" || true
exit 1
