variable "project_name" {
  description = "Prefixo usado no nome dos recursos."
  type        = string
  default     = "travessia"
}

# Credenciais do OpenStack (apenas no .tfvars, fora do repo).
variable "openstack_user" {
  description = "Usuário do OpenStack."
  type        = string
}

variable "openstack_password" {
  description = "Senha do OpenStack."
  type        = string
  sensitive   = true
}

variable "openstack_tenant_id" {
  description = "Tenant/project ID do OpenStack."
  type        = string
}

variable "openstack_auth_url" {
  description = "URL de autenticação do OpenStack."
  type        = string
}

variable "openstack_region" {
  description = "Região do OpenStack."
  type        = string
  default     = "SAO1"
}

# Infra da instância.
variable "image_name" {
  description = "Imagem (Ubuntu 24.04) do OpenStack."
  type        = string
  default     = "Ubuntu 24.04"
}

variable "flavor_name" {
  description = "Flavor da instância."
  type        = string
  default     = "m1.small"
}

variable "ssh_public_key_path" {
  description = "Caminho local da chave pública SSH usada para criar o keypair."
  type        = string
}

# Segurança: quais CIDRs abrem a porta administrativa.
# NUNCA 0.0.0.0/0 na porta admin. Só a porta 80 fica aberta ao público.
variable "admin_ssh_cidr" {
  description = "CIDR autorizado a acessar o SSH/admin da VPS."
  type        = string
  default     = "SEU_IP_DE_CASA/32" # troque no .tfvars
}

variable "public_web_cidr" {
  description = "CIDR autorizado a acessar o site na porta 80 (público)."
  type        = string
  default     = "0.0.0.0/0"
}