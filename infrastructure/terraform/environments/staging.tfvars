# Staging Environment Configuration

environment = "staging"
aws_region  = "us-east-1"

# Domain
domain_name = "staging.stakeholderradar.com"

# Networking
vpc_cidr = "10.1.0.0/16"

# Database (Staging sizing)
db_instance_class    = "db.t3.medium"     # 2 vCPU, 4 GB RAM
db_allocated_storage = 50                  # 50 GB initial
db_name              = "stakeholder_radar_staging"
db_username          = "postgres"

# Cache (Staging sizing)
cache_node_type  = "cache.t3.medium"      # 2 vCPU, 3.09 GB RAM
cache_num_nodes  = 1                       # Single node

# Application Servers
app_ami_id           = "ami-0abcdef1234567890"  # Replace with your AMI
app_instance_type    = "t3.medium"              # 2 vCPU, 4 GB RAM
app_min_size         = 2                         # Minimum instances
app_max_size         = 4                         # Maximum instances
app_desired_capacity = 2                         # Initial instances

# Monitoring & Alerts
alert_email        = "dev-team@stakeholderradar.com"
slack_webhook_url  = ""  # Optional

# Bastion Host Access
bastion_allowed_cidrs = [
  "203.0.113.0/24"   # Office IP range
]
bastion_instance_type = "t3.micro"

# Additional Tags
additional_tags = {
  CostCenter = "Engineering"
  Team       = "Development"
}
