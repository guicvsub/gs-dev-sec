variable "aws_region" {
  description = "Região da AWS onde a infraestrutura será criada."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefixo usado no nome dos recursos."
  type        = string
  default     = "travessia"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,20}$", var.project_name))
    error_message = "Use de 3 a 20 caracteres: letras minúsculas, números e hífen."
  }
}

variable "instance_type" {
  description = "Tipo da instância EC2."
  type        = string
  default     = "t3.micro"
}

variable "alert_email" {
  description = "E-mail que recebe os alertas do CloudWatch (vazio = não cria assinatura)."
  type        = string
  default     = ""
}

variable "allowed_http_cidr" {
  description = "CIDR autorizado a acessar o site na porta 80."
  type        = string
  default     = "0.0.0.0/0"
}

variable "root_volume_size" {
  description = "Tamanho do disco raiz em GB."
  type        = number
  default     = 20
}

variable "log_retention_days" {
  description = "Retenção dos logs no CloudWatch, em dias."
  type        = number
  default     = 14
}
