# Stakeholder Radar - Deployment Guide

Complete guide for deploying Stakeholder Radar to AWS with enterprise security.

## 📋 Prerequisites

### Required Tools
- AWS CLI v2+ ([Install](https://aws.amazon.com/cli/))
- Terraform v1.0+ ([Install](https://www.terraform.io/downloads))
- Node.js 18+ ([Install](https://nodejs.org/))
- PostgreSQL client ([Install](https://www.postgresql.org/download/))
- Git

### AWS Account Setup
- AWS account with admin access (initially)
- AWS CLI configured with credentials
- Route 53 hosted zone for your domain
- Verified SES email (for alerts)

### Required Permissions
Your IAM user needs these permissions:
- EC2 Full Access
- RDS Full Access
- ElastiCache Full Access
- S3 Full Access
- CloudWatch Full Access
- IAM Role Management
- Secrets Manager Full Access
- Certificate Manager Full Access

---

## 🚀 Deployment Steps

### Phase 1: Infrastructure Setup

#### Step 1: Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Verify credentials
aws sts get-caller-identity

# Output should show your account ID and user ARN
```

#### Step 2: Create S3 Backend for Terraform State

```bash
# Create S3 bucket for terraform state
aws s3api create-bucket \
  --bucket stakeholder-radar-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket stakeholder-radar-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket stakeholder-radar-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

#### Step 3: Initialize Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Output: Success! The configuration is valid.
```

#### Step 4: Configure Environment

```bash
# Copy environment configuration
cp environments/production.tfvars terraform.tfvars

# Edit terraform.tfvars with your values
vim terraform.tfvars

# Update these values:
# - domain_name: your actual domain
# - app_ami_id: your application AMI (see AMI creation below)
# - alert_email: your ops email
# - bastion_allowed_cidrs: your office/VPN IP ranges
```

#### Step 5: Create Application AMI

```bash
# Launch temporary EC2 instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \  # Amazon Linux 2023 AMI
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx

# SSH into instance
ssh -i your-key.pem ec2-user@<instance-public-ip>

# Install Node.js and dependencies
sudo yum update -y
sudo yum install -y git

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone your application
git clone https://github.com/your-org/stakeholder-radar.git
cd stakeholder-radar

# Install dependencies
cd backend && npm install
cd ../frontend && npm install && npm run build

# Configure PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Create AMI from this instance
exit

# From your local machine
aws ec2 create-image \
  --instance-id i-xxxxxxxxx \
  --name "stakeholder-radar-app-$(date +%Y%m%d-%H%M%S)" \
  --description "Stakeholder Radar Application AMI"

# Get AMI ID from output and update terraform.tfvars
```

#### Step 6: Review Terraform Plan

```bash
# Generate execution plan
terraform plan -out=tfplan

# Review the plan carefully
# - Check resource counts
# - Verify security groups
# - Confirm database settings
# - Review IAM roles
```

#### Step 7: Deploy Infrastructure

```bash
# Apply the plan (this will create ALL resources)
terraform apply tfplan

# This will take ~15-20 minutes
# - VPC and networking: ~2 min
# - RDS database: ~10 min
# - ElastiCache: ~5 min
# - Load balancer & ASG: ~3 min

# Save outputs
terraform output > outputs.txt
```

---

### Phase 2: Secrets Configuration

#### Step 8: Store Application Secrets

```bash
# Database password (already created by Terraform)
# JWT secrets
aws secretsmanager create-secret \
  --name production/jwt/access-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --region us-east-1

aws secretsmanager create-secret \
  --name production/jwt/refresh-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --region us-east-1

# OAuth encryption key
aws secretsmanager create-secret \
  --name production/oauth/encryption-key \
  --secret-string "$(openssl rand -base64 32)" \
  --region us-east-1

# Slack OAuth credentials
aws secretsmanager create-secret \
  --name production/oauth/slack-client-id \
  --secret-string "your-slack-client-id" \
  --region us-east-1

aws secretsmanager create-secret \
  --name production/oauth/slack-client-secret \
  --secret-string "your-slack-client-secret" \
  --region us-east-1

# Google OAuth credentials
aws secretsmanager create-secret \
  --name production/oauth/google-client-id \
  --secret-string "your-google-client-id" \
  --region us-east-1

aws secretsmanager create-secret \
  --name production/oauth/google-client-secret \
  --secret-string "your-google-client-secret" \
  --region us-east-1

# Jira OAuth credentials
aws secretsmanager create-secret \
  --name production/oauth/jira-client-id \
  --secret-string "your-jira-client-id" \
  --region us-east-1

aws secretsmanager create-secret \
  --name production/oauth/jira-client-secret \
  --secret-string "your-jira-client-secret" \
  --region us-east-1
```

#### Step 9: Configure Environment Variables

```bash
# SSH into one app server via bastion host
ssh -i your-key.pem -J ec2-user@<bastion-ip> ec2-user@<app-server-ip>

# Create .env file
cat > /home/ec2-user/stakeholder-radar/backend/.env << 'EOF'
# Environment
NODE_ENV=production
ENVIRONMENT=production
PORT=3000

# Database (will be fetched from Secrets Manager)
DATABASE_HOST=<RDS_ENDPOINT>
DATABASE_PORT=5432
DATABASE_NAME=stakeholder_radar
DATABASE_USER=postgres
DATABASE_PASSWORD_SECRET=production/database/master-password

# Redis
REDIS_HOST=<ELASTICACHE_ENDPOINT>
REDIS_PORT=6379

# JWT Secrets (references)
JWT_ACCESS_SECRET_SECRET=production/jwt/access-secret
JWT_REFRESH_SECRET_SECRET=production/jwt/refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OAuth
OAUTH_ENCRYPTION_KEY_SECRET=production/oauth/encryption-key
SLACK_CLIENT_ID_SECRET=production/oauth/slack-client-id
SLACK_CLIENT_SECRET_SECRET=production/oauth/slack-client-secret
GOOGLE_CLIENT_ID_SECRET=production/oauth/google-client-id
GOOGLE_CLIENT_SECRET_SECRET=production/oauth/google-client-secret
JIRA_CLIENT_ID_SECRET=production/oauth/jira-client-id
JIRA_CLIENT_SECRET_SECRET=production/oauth/jira-client-secret

# CORS
CORS_ORIGIN=https://app.stakeholderradar.com

# AWS
AWS_REGION=us-east-1
EOF

# Set correct permissions
chmod 600 /home/ec2-user/stakeholder-radar/backend/.env
```

---

### Phase 3: Database Setup

#### Step 10: Initialize Database

```bash
# Connect to RDS via bastion host
ssh -i your-key.pem -L 5432:<RDS_ENDPOINT>:5432 ec2-user@<bastion-ip>

# In another terminal, connect to database
psql -h localhost -U postgres -d stakeholder_radar

# Run migrations
\i backend/migrations/001_create_auth_tables.sql
\i backend/migrations/002_create_app_tables.sql
\i backend/migrations/003_create_oauth_tables.sql

# Verify tables
\dt

# Create first admin user
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
  'admin@stakeholderradar.com',
  -- Use bcrypt to hash password
  '$2b$12$...',  -- Replace with actual bcrypt hash
  'Admin',
  'User',
  'admin'
);

# Exit
\q
```

#### Step 11: Run Database Optimizations

```sql
-- Connect to database
psql -h localhost -U postgres -d stakeholder_radar

-- Analyze tables for query optimization
ANALYZE;

-- Create additional indexes if needed
CREATE INDEX CONCURRENTLY idx_projects_created_at ON projects(created_at);
CREATE INDEX CONCURRENTLY idx_stakeholders_engagement ON stakeholders(engagement_level);

-- Set up monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

---

### Phase 4: Application Deployment

#### Step 12: Start Application

```bash
# SSH into app server
ssh -i your-key.pem -J ec2-user@<bastion-ip> ec2-user@<app-server-ip>

cd /home/ec2-user/stakeholder-radar

# Start backend
cd backend
pm2 start npm --name "stakeholder-radar-backend" -- start

# Serve frontend (using nginx or serve)
cd ../frontend
pm2 start serve --name "stakeholder-radar-frontend" -- -s build -l 3000

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs
```

#### Step 13: Configure Application Load Balancer Target

```bash
# Verify health check endpoint
curl http://localhost:3000/health

# Should return: {"status":"ok","timestamp":"..."}

# Verify app servers are healthy in ALB
aws elbv2 describe-target-health \
  --target-group-arn <TARGET_GROUP_ARN>

# Should show "healthy" state
```

---

### Phase 5: DNS & SSL Configuration

#### Step 14: Configure Route 53

```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Create Route 53 record
aws route53 change-resource-record-sets \
  --hosted-zone-id <HOSTED_ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.stakeholderradar.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<ALB_HOSTED_ZONE_ID>",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Verify DNS propagation
dig app.stakeholderradar.com

# Should resolve to ALB
```

#### Step 15: Verify SSL/TLS

```bash
# Test HTTPS
curl -I https://app.stakeholderradar.com

# Should return 200 OK with security headers

# Test HTTP to HTTPS redirect
curl -I http://app.stakeholderradar.com

# Should return 301 redirect to HTTPS

# Verify certificate
openssl s_client -connect app.stakeholderradar.com:443 -servername app.stakeholderradar.com

# Should show valid certificate
```

---

### Phase 6: Monitoring & Alerting

#### Step 16: Configure CloudWatch Dashboards

```bash
# CloudWatch dashboards are created by Terraform
# Access them in AWS Console:
aws cloudwatch list-dashboards

# Open in browser:
# https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=stakeholder-radar-production
```

#### Step 17: Test Alerts

```bash
# Trigger a test alarm
aws cloudwatch set-alarm-state \
  --alarm-name production-high-error-rate \
  --state-value ALARM \
  --state-reason "Testing alert system"

# Check email inbox for alert
# Check Slack channel if configured
```

#### Step 18: Configure Log Aggregation

```bash
# Install CloudWatch Logs agent on app servers
sudo yum install -y amazon-cloudwatch-agent

# Create CloudWatch agent config
sudo cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ec2-user/.pm2/logs/stakeholder-radar-backend-out.log",
            "log_group_name": "/aws/stakeholder-radar/production/backend",
            "log_stream_name": "{instance_id}/stdout"
          },
          {
            "file_path": "/home/ec2-user/.pm2/logs/stakeholder-radar-backend-error.log",
            "log_group_name": "/aws/stakeholder-radar/production/backend",
            "log_stream_name": "{instance_id}/stderr"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

---

### Phase 7: Backup Verification

#### Step 19: Verify Automated Backups

```bash
# Check RDS automated backups
aws rds describe-db-snapshots \
  --db-instance-identifier stakeholder-radar-production

# Should show daily automated snapshots

# Check AWS Backup
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name stakeholder-radar-production

# Verify backup schedule
aws backup get-backup-plan \
  --backup-plan-id <BACKUP_PLAN_ID>
```

#### Step 20: Test Backup Restoration

```bash
# Create test restore from latest snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier stakeholder-radar-restore-test \
  --db-snapshot-identifier <LATEST_SNAPSHOT_ID> \
  --db-instance-class db.t3.small

# Wait for restore to complete (~10 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier stakeholder-radar-restore-test

# Connect and verify data
psql -h <RESTORED_ENDPOINT> -U postgres -d stakeholder_radar

# Clean up test restore
aws rds delete-db-instance \
  --db-instance-identifier stakeholder-radar-restore-test \
  --skip-final-snapshot
```

---

## ✅ Post-Deployment Checklist

### Security Verification

- [ ] All traffic is HTTPS only
- [ ] Security groups follow least privilege
- [ ] Database is not publicly accessible
- [ ] Secrets are in Secrets Manager (not hardcoded)
- [ ] IAM roles follow least privilege
- [ ] WAF rules are active
- [ ] CloudWatch alarms are working
- [ ] Backup schedule is active
- [ ] SSL certificate is valid
- [ ] Rate limiting is enabled

### Functionality Verification

- [ ] Application loads successfully
- [ ] User authentication works
- [ ] Database connections succeed
- [ ] Redis cache is accessible
- [ ] OAuth integrations work
- [ ] File uploads work (S3)
- [ ] Email alerts send
- [ ] API endpoints respond
- [ ] Frontend loads assets
- [ ] Logs are being collected

### Performance Verification

- [ ] Load balancer health checks pass
- [ ] Response times < 2 seconds
- [ ] Auto-scaling works
- [ ] Database queries optimized
- [ ] Cache hit rate > 80%
- [ ] CDN is serving static assets
- [ ] Gzip compression enabled
- [ ] HTTP/2 enabled

---

## 🔧 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs

# Check system logs
sudo journalctl -u amazon-cloudwatch-agent -n 50

# Verify environment variables
cat /home/ec2-user/stakeholder-radar/backend/.env

# Test database connection
psql -h <RDS_ENDPOINT> -U postgres -d stakeholder_radar

# Test Redis connection
redis-cli -h <REDIS_ENDPOINT> ping
```

### High Error Rates

```bash
# Check CloudWatch Logs
aws logs tail /aws/stakeholder-radar/production/backend --follow

# Check ALB logs
aws s3 sync s3://stakeholder-radar-alb-logs/production/ ./alb-logs/

# Check application metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=<ALB_ARN_SUFFIX> \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Database Connection Issues

```bash
# Verify security group
aws ec2 describe-security-groups --group-ids <DB_SG_ID>

# Test connectivity from app server
nc -zv <RDS_ENDPOINT> 5432

# Check database logs
aws rds describe-db-log-files \
  --db-instance-identifier stakeholder-radar-production

# Download latest error log
aws rds download-db-log-file-portion \
  --db-instance-identifier stakeholder-radar-production \
  --log-file-name error/postgresql.log.2024-01-15-00
```

---

## 📊 Monitoring Metrics

### Key Metrics to Watch

**Application:**
- Request count
- Error rate (5XX)
- Response time (p50, p95, p99)
- Healthy target count

**Database:**
- CPU utilization (< 80%)
- Connection count (< 80% of max)
- Read/write latency
- Free storage space (> 10 GB)

**Cache:**
- Cache hit rate (> 80%)
- CPU utilization
- Network throughput
- Evicted keys

**Infrastructure:**
- Auto-scaling activity
- Instance health
- Network errors
- Disk I/O

---

## 🚨 Incident Response

### High Error Rate

1. Check CloudWatch alarms
2. Review application logs
3. Check database connections
4. Verify external services (OAuth providers)
5. Roll back if recent deployment

### Database Issues

1. Check CloudWatch metrics (CPU, connections)
2. Review slow query log
3. Check for long-running queries
4. Verify backups are current
5. Scale up if needed

### Performance Degradation

1. Check auto-scaling status
2. Review cache hit rates
3. Analyze slow queries
4. Check CDN performance
5. Review recent changes

---

## 📝 Maintenance Tasks

### Daily
- Review CloudWatch dashboards
- Check backup success
- Monitor error rates
- Review security alerts

### Weekly
- Review and rotate logs
- Check for security updates
- Review cost optimization
- Test disaster recovery

### Monthly
- Review and update secrets
- Audit IAM permissions
- Review and optimize queries
- Test full backup restoration
- Review and update documentation

---

## 🎯 Success Criteria

Your deployment is successful when:

✅ Application is accessible via HTTPS
✅ All health checks pass
✅ Database backups run daily
✅ Monitoring alerts are configured
✅ Security best practices implemented
✅ Documentation is complete
✅ Team is trained on operations

**Congratulations! Your Stakeholder Radar application is now deployed securely in the cloud!** 🎉
