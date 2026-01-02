# Production Environment Configuration
# Copy to terraform.tfvars and customize

environment = "production"
aws_region  = "us-east-1"

# Domain
domain_name = "app.stakeholderradar.com"

# Networking
vpc_cidr = "10.0.0.0/16"

# Database (Production sizing)
db_instance_class    = "db.m5.large"      # 2 vCPU, 8 GB RAM
db_allocated_storage = 100                # 100 GB initial
db_name              = "stakeholder_radar"
db_username          = "postgres"

# Cache (Production sizing)
cache_node_type  = "cache.m5.large"       # 2 vCPU, 6.38 GB RAM
cache_num_nodes  = 2                       # Cluster mode

# Application Servers
app_ami_id           = "ami-0abcdef1234567890"  # Replace with your AMI
app_instance_type    = "t3.large"               # 2 vCPU, 8 GB RAM
app_min_size         = 3                         # Minimum instances
app_max_size         = 10                        # Maximum instances
app_desired_capacity = 3                         # Initial instances

# Monitoring & Alerts
alert_email        = "ops@stakeholderradar.com"
slack_webhook_url  = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Bastion Host Access
bastion_allowed_cidrs = [
  "203.0.113.0/24",  # Office IP range
  "198.51.100.0/24"  # VPN IP range
]
bastion_instance_type = "t3.micro"

# Additional Tags
additional_tags = {
  CostCenter  = "Engineering"
  Team        = "Platform"
  Compliance  = "SOC2"
}
