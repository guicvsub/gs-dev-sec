output "public_ip" {
  description = "IP público (floating IP) do MVP."
  value       = openstack_networking_floatingip_v2.public.address
}

output "public_url" {
  description = "URL pública do MVP."
  value       = "http://${openstack_networking_floatingip_v2.public.address}/"
}

output "instance_name" {
  description = "Nome da instância."
  value       = openstack_compute_instance_v2.web.name
}