# Stakeholder Radar - AWS Infrastructure
# Terraform configuration for secure cloud deployment

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configuration (uncomment for production)
  # backend "s3" {
  #   bucket         = "stakeholder-radar-terraform-state"
  #   key            = "production/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Stakeholder Radar"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names
}

# Security Groups
module "security_groups" {
  source = "./modules/security"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"

  environment = var.environment
  aws_region  = var.aws_region
}

# Database (RDS PostgreSQL)
module "database" {
  source = "./modules/database"

  environment           = var.environment
  vpc_id               = module.vpc.vpc_id
  db_subnet_ids        = module.vpc.database_subnet_ids
  db_security_group_id = module.security_groups.database_sg_id
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  master_password      = module.secrets.db_master_password
  kms_key_id          = module.secrets.kms_key_id
}

# Redis Cache (ElastiCache)
module "cache" {
  source = "./modules/cache"

  environment          = var.environment
  vpc_id              = module.vpc.vpc_id
  cache_subnet_ids    = module.vpc.cache_subnet_ids
  cache_security_group_id = module.security_groups.redis_sg_id
  node_type           = var.cache_node_type
}

# Application Load Balancer
module "load_balancer" {
  source = "./modules/alb"

  environment           = var.environment
  vpc_id               = module.vpc.vpc_id
  public_subnet_ids    = module.vpc.public_subnet_ids
  alb_security_group_id = module.security_groups.alb_sg_id
  certificate_arn      = module.certificates.certificate_arn
}

# Auto Scaling Group for App Servers
module "app_servers" {
  source = "./modules/compute"

  environment              = var.environment
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  app_security_group_id   = module.security_groups.app_sg_id
  iam_instance_profile    = module.iam.app_instance_profile_name
  target_group_arn        = module.load_balancer.target_group_arn
  ami_id                  = var.app_ami_id
  instance_type           = var.app_instance_type
  min_size                = var.app_min_size
  max_size                = var.app_max_size
  desired_capacity        = var.app_desired_capacity
}

# S3 Buckets
module "storage" {
  source = "./modules/s3"

  environment = var.environment
  kms_key_id  = module.secrets.kms_key_id
}

# IAM Roles and Policies
module "iam" {
  source = "./modules/iam"

  environment    = var.environment
  aws_region     = var.aws_region
  account_id     = data.aws_caller_identity.current.account_id
  app_bucket_arn = module.storage.app_bucket_arn
}

# SSL/TLS Certificates
module "certificates" {
  source = "./modules/acm"

  environment = var.environment
  domain_name = var.domain_name
}

# CloudWatch Monitoring
module "monitoring" {
  source = "./modules/monitoring"

  environment               = var.environment
  alb_arn_suffix           = module.load_balancer.alb_arn_suffix
  target_group_arn_suffix  = module.load_balancer.target_group_arn_suffix
  db_instance_id           = module.database.db_instance_id
  cache_cluster_id         = module.cache.cache_cluster_id
  alert_email              = var.alert_email
}

# Automated Backups
module "backups" {
  source = "./modules/backups"

  environment      = var.environment
  db_instance_arn  = module.database.db_instance_arn
  backup_role_arn  = module.iam.backup_role_arn
}

# WAF (Web Application Firewall)
module "waf" {
  source = "./modules/waf"

  environment = var.environment
  alb_arn     = module.load_balancer.alb_arn
}

# Bastion Host (for emergency access)
module "bastion" {
  source = "./modules/bastion"

  environment           = var.environment
  vpc_id               = module.vpc.vpc_id
  public_subnet_id     = module.vpc.public_subnet_ids[0]
  bastion_sg_id        = module.security_groups.bastion_sg_id
  allowed_cidr_blocks  = var.bastion_allowed_cidrs
}

# Outputs
output "alb_dns_name" {
  description = "Load balancer DNS name"
  value       = module.load_balancer.alb_dns_name
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = module.database.db_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.cache.cache_endpoint
  sensitive   = true
}

output "bastion_public_ip" {
  description = "Bastion host public IP"
  value       = module.bastion.public_ip
}

output "app_bucket_name" {
  description = "S3 application bucket name"
  value       = module.storage.app_bucket_name
}
