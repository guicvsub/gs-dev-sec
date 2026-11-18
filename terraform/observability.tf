# O CloudWatch Logs já criptografa em repouso com a chave gerenciada pela AWS
# (aws/logs) por padrão, sem custo extra. Uma CMK dedicada fica como evolução;
# a exceção abaixo evita um falso positivo do Semgrep para esse padrão.
# nosemgrep: terraform.aws.security.aws-cloudwatch-log-group-unencrypted.aws-cloudwatch-log-group-unencrypted
resource "aws_cloudwatch_log_group" "web" {
  name              = "${var.project_name}-web"
  retention_in_days = var.log_retention_days
}

# O Nginx grava access logs em JSON (nginx.conf). Este filtro conta respostas 5xx.
resource "aws_cloudwatch_log_metric_filter" "http_5xx" {
  name           = "${var.project_name}-http-5xx"
  log_group_name = aws_cloudwatch_log_group.web.name
  pattern        = "{ $.status >= 500 }"

  metric_transformation {
    name          = "Http5xx"
    namespace     = "Travessia/Web"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  count = var.alert_email == "" ? 0 : 1

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "http_5xx" {
  alarm_name          = "${var.project_name}-http-5xx"
  alarm_description   = "O site respondeu com erro 5xx. Veja os logs no CloudWatch."
  namespace           = "Travessia/Web"
  metric_name         = "Http5xx"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.project_name}-cpu-high"
  alarm_description   = "CPU da instancia acima de 80% por 10 minutos."
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  dimensions          = { InstanceId = aws_instance.web.id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "status_check" {
  alarm_name          = "${var.project_name}-status-check"
  alarm_description   = "A instancia falhou na verificacao de status da AWS."
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed"
  dimensions          = { InstanceId = aws_instance.web.id }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 5
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-mvp"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "CPU da instancia"
          region  = var.aws_region
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.web.id]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Erros HTTP 5xx (metric filter)"
          region  = var.aws_region
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["Travessia/Web", "Http5xx"]
          ]
          period = 300
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Rede da instancia"
          region  = var.aws_region
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/EC2", "NetworkIn", "InstanceId", aws_instance.web.id],
            ["AWS/EC2", "NetworkOut", "InstanceId", aws_instance.web.id]
          ]
          period = 300
          stat   = "Average"
        }
      },
      {
        type   = "log"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Ultimos erros 5xx"
          region = var.aws_region
          view   = "table"
          query  = "SOURCE '${aws_cloudwatch_log_group.web.name}' | fields @timestamp, remote_addr, request, status | filter status >= 500 | sort @timestamp desc | limit 20"
        }
      },
      {
        type   = "alarm"
        x      = 0
        y      = 12
        width  = 24
        height = 4
        properties = {
          title = "Alarmes do MVP"
          alarms = [
            aws_cloudwatch_metric_alarm.cpu_high.arn,
            aws_cloudwatch_metric_alarm.http_5xx.arn,
            aws_cloudwatch_metric_alarm.status_check.arn,
          ]
        }
      }
    ]
  })
}
