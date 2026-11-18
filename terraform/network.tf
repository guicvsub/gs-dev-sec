# Rede da VPS. Porta administrativa/SSH NUNCA aberta para 0.0.0.0/0.
# Somente a porta 80 (site público) fica aberta ao público.

resource "openstack_networking_secgroup_v2" "web" {
  name        = "${var.project_name}-secgroup"
  description = "Somente HTTP 80 público; admin/SSH restrito."
}

# Site público (porta 80) - exposta ao público.
resource "openstack_networking_secgroup_rule_v2" "http_public" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = var.public_web_cidr
  security_group_id = openstack_networking_secgroup_v2.web.id
}

# SSH administrativo - RESTRITO a um CIDR específico (nunca 0.0.0.0/0).
resource "openstack_networking_secgroup_rule_v2" "ssh_admin" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = var.admin_ssh_cidr
  security_group_id = openstack_networking_secgroup_v2.web.id
}

# Saída liberada (para usar o site externo e atualizar pacotes).
resource "openstack_networking_secgroup_rule_v2" "egress_all" {
  direction         = "egress"
  ethertype         = "IPv4"
  protocol          = ""
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.web.id
}