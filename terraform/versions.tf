# Terraform - Travessia (VPS AIS / OpenStack)
# Nuvem (VPS) declarada como código. Estado e .tfvars ficam FORA do repositório.
#
# Estado remoto (fora do repo): preencha backend.hcl e rode:
#   terraform init -backend-config=backend.hcl
# O arquivo backend.hcl está no .gitignore.

terraform {
  required_version = ">= 1.4.0"

  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 1.54"
    }
  }

  # Estado remoto: substitua pelo backend do seu provedor (local ou HTTP/S3 próprio).
  # backend "local" { path = "terraform.tfstate" }  # mantém fora do git via .gitignore
}