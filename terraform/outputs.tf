output "public_ip" {
  description = "IP público (Elastic IP) do MVP."
  value       = aws_eip.web.public_ip
}

output "public_url" {
  description = "URL pública do MVP."
  value       = "http://${aws_eip.web.public_ip}/"
}

output "instance_id" {
  description = "ID da instância EC2 (usado pelo SSM no deploy)."
  value       = aws_instance.web.id
}

output "ecr_repository_url" {
  description = "URL do repositório ECR onde a imagem é publicada."
  value       = aws_ecr_repository.web.repository_url
}

output "log_group_name" {
  description = "Log group do CloudWatch que recebe os logs do Nginx."
  value       = aws_cloudwatch_log_group.web.name
}

output "dashboard_url" {
  description = "URL do dashboard no console da AWS."
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "sns_topic_arn" {
  description = "Tópico SNS que entrega os alertas por e-mail."
  value       = aws_sns_topic.alerts.arn
}

output "ssm_session_command" {
  description = "Comando para abrir um shell na instância sem SSH."
  value       = "aws ssm start-session --target ${aws_instance.web.id} --region ${var.aws_region}"
}

output "alarm_names" {
  description = "Alarmes criados no CloudWatch."
  value = [
    aws_cloudwatch_metric_alarm.cpu_high.alarm_name,
    aws_cloudwatch_metric_alarm.http_5xx.alarm_name,
    aws_cloudwatch_metric_alarm.status_check.alarm_name,
  ]
}
