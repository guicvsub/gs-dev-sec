# Credenciais do OpenStack (AIS Provedor) via variáveis de ambiente.
# NUNCA coloque credenciais aqui nem em .tfvars versionado.
provider "openstack" {
  # Ambiente fornece: OS_AUTH_URL, OS_USERNAME, OS_PASSWORD,
  # OS_PROJECT_NAME, OS_USER_DOMAIN_NAME, OS_PROJECT_DOMAIN_NAME, OS_REGION_NAME
  # auth_url = "https://identity.aisprovedor.com.br/v3"
  # region   = "SAO1"
  user_name = var.openstack_user
  password  = var.openstack_password
  tenant_id = var.openstack_tenant_id
  auth_url  = var.openstack_auth_url
  region    = var.openstack_region
}