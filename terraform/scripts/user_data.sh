#!/usr/bin/env bash
# Executado uma vez no primeiro boot da instância EC2 (Ubuntu 24.04).
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y docker.io curl unzip

systemctl enable --now docker
usermod -aG docker ubuntu

# AWS CLI v2: usada pelo deploy para autenticar no ECR.
if ! command -v aws >/dev/null 2>&1; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
  rm -rf /tmp/aws /tmp/awscliv2.zip
fi

# SSM Agent (a AMI da Canonical já inclui; garantimos que esteja ativo).
if ! snap list amazon-ssm-agent >/dev/null 2>&1; then
  snap install amazon-ssm-agent --classic || true
fi
systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service || true

install -d -o ubuntu -g ubuntu /opt/travessia

echo "user_data concluido" >/var/log/travessia-user-data.log
