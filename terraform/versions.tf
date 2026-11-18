terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }

  # Estado remoto no S3. O bucket é criado pelo workflow e os valores são
  # passados no init:
  #   terraform init -backend-config="bucket=..." \
  #                  -backend-config="key=travessia/terraform.tfstate" \
  #                  -backend-config="region=us-east-1"
  # use_lockfile usa o próprio S3 como lock (Terraform >= 1.10, sem DynamoDB).
  backend "s3" {
    use_lockfile = true
    encrypt      = true
  }
}
