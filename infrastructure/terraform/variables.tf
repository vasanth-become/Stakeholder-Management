# Stakeholder Radar - Terraform Variables

# Environment
variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Networking
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

# Domain
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

# Database
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 50
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "stakeholder_radar"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
}

# Cache
variable "cache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "cache_num_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

# Application Servers
variable "app_ami_id" {
  description = "AMI ID for app servers"
  type        = string
}

variable "app_instance_type" {
  description = "EC2 instance type for app servers"
  type        = string
  default     = "t3.medium"
}

variable "app_min_size" {
  description = "Minimum number of app servers"
  type        = number
  default     = 2
}

variable "app_max_size" {
  description = "Maximum number of app servers"
  type        = number
  default     = 10
}

variable "app_desired_capacity" {
  description = "Desired number of app servers"
  type        = number
  default     = 3
}

# Monitoring
variable "alert_email" {
  description = "Email address for CloudWatch alarms"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

# Bastion Host
variable "bastion_allowed_cidrs" {
  description = "CIDR blocks allowed to access bastion host"
  type        = list(string)
  default     = []
}

variable "bastion_instance_type" {
  description = "EC2 instance type for bastion host"
  type        = string
  default     = "t3.micro"
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
