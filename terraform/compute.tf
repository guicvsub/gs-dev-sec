# Instância da VPS que publica o MVP com Docker + Nginx.

resource "openstack_compute_keypair_v2" "admin" {
  name       = "${var.project_name}-keypair"
  public_key = file(var.ssh_public_key_path)
}

resource "openstack_compute_instance_v2" "web" {
  name        = "${var.project_name}-web"
  image_name  = var.image_name
  flavor_name = var.flavor_name
  key_pair    = openstack_compute_keypair_v2.admin.name

  metadata = {
    Name    = "${var.project_name}-web"
    Purpose = "MVP Travessia - Docker + Nginx"
  }
}

resource "openstack_networking_floatingip_v2" "public" {
  description = "IP público do MVP"
}

resource "openstack_compute_floatingip_associate_v2" "web" {
  floating_ip = openstack_networking_floatingip_v2.public.address
  instance_id = openstack_compute_instance_v2.web.id
}