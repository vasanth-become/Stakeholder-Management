# Stakeholder Radar - Secure Cloud Architecture

Production-ready cloud infrastructure with enterprise security, high availability, and automated operations.

## 🏗️ Architecture Overview

```
                                    ┌─────────────────────────┐
                                    │   Route 53 / Cloud DNS  │
                                    │   (DNS & Health Checks) │
                                    └───────────┬─────────────┘
                                                │
                                    ┌───────────▼─────────────┐
                                    │   CloudFront / CDN      │
                                    │   (SSL/TLS, WAF, DDoS)  │
                                    └───────────┬─────────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
        ┌───────────▼──────────┐   ┌───────────▼──────────┐   ┌───────────▼──────────┐
        │  Development ENV     │   │   Staging ENV        │   │  Production ENV      │
        │  (dev.stakeholder.*) │   │ (staging.stakeholder)│   │ (app.stakeholder.*)  │
        └──────────────────────┘   └──────────────────────┘   └──────────────────────┘
                │                              │                          │
        ┌───────▼──────────┐          ┌───────▼──────────┐      ┌────────▼─────────┐
        │  Load Balancer   │          │  Load Balancer   │      │  Load Balancer   │
        │  (Internal SSL)  │          │  (Internal SSL)  │      │  (Multi-AZ)      │
        └───────┬──────────┘          └───────┬──────────┘      └────────┬─────────┘
                │                              │                          │
        ┌───────▼──────────┐          ┌───────▼──────────┐      ┌────────▼─────────┐
        │  App Servers     │          │  App Servers     │      │  App Servers     │
        │  (1 instance)    │          │  (2 instances)   │      │  (3+ instances)  │
        │  - Node.js       │          │  - Auto-scaling  │      │  - Auto-scaling  │
        │  - React         │          │  - Health checks │      │  - Health checks │
        └───────┬──────────┘          └───────┬──────────┘      └────────┬─────────┘
                │                              │                          │
        ┌───────▼──────────┐          ┌───────▼──────────┐      ┌────────▼─────────┐
        │  PostgreSQL DB   │          │  PostgreSQL DB   │      │  PostgreSQL RDS  │
        │  (Single)        │          │  (Replica)       │      │  (Multi-AZ)      │
        │                  │          │  - Read replica  │      │  - Auto backups  │
        └───────┬──────────┘          └───────┬──────────┘      │  - Encryption    │
                │                              │                 └────────┬─────────┘
                │                              │                          │
        ┌───────▼──────────┐          ┌───────▼──────────┐      ┌────────▼─────────┐
        │  Redis Cache     │          │  Redis Cache     │      │  ElastiCache     │
        │  (Single)        │          │  (Single)        │      │  (Cluster mode)  │
        └──────────────────┘          └──────────────────┘      └──────────────────┘

                                    ┌─────────────────────────┐
                                    │  Shared Services        │
                                    ├─────────────────────────┤
                                    │  - Secrets Manager      │
                                    │  - CloudWatch/Monitor   │
                                    │  - S3/Cloud Storage     │
                                    │  - IAM/Permissions      │
                                    │  - VPC/Networking       │
                                    └─────────────────────────┘
```

---

## 🌍 Multi-Environment Strategy

### Development Environment
**Purpose:** Active development and testing

**Resources:**
- 1 small app server (t3.small or equivalent)
- 1 small database (db.t3.micro)
- No load balancer (direct access)
- Minimal Redis instance
- No high availability
- No auto-scaling

**Access:**
- Limited to internal IPs
- VPN required for external access
- No public database access
- HTTPS optional (can use HTTP for debugging)

**Cost:** ~$50-100/month

### Staging Environment
**Purpose:** Pre-production testing and QA

**Resources:**
- 2 medium app servers (t3.medium)
- 1 database with read replica (db.t3.small)
- Application load balancer
- Redis cache
- Basic auto-scaling (2-4 instances)
- Daily backups

**Access:**
- Limited to team + stakeholders
- HTTPS enforced
- Separate VPC from production
- Database in private subnet

**Cost:** ~$200-300/month

### Production Environment
**Purpose:** Live application serving customers

**Resources:**
- 3+ app servers (t3.large) across multiple AZs
- Multi-AZ RDS PostgreSQL (db.m5.large)
- Application load balancer (multi-AZ)
- ElastiCache Redis cluster
- Aggressive auto-scaling (3-10 instances)
- Hourly automated backups (retained 30 days)
- Point-in-time recovery enabled

**Access:**
- Public via HTTPS only
- All internal resources in private subnets
- Database never publicly accessible
- Bastion host for emergency access

**Cost:** ~$800-1500/month (baseline)

---

## 🔒 Security Architecture

### Network Security

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────┐
│              Public Subnet                      │
│  ┌──────────────┐      ┌──────────────┐        │
│  │ Load Balancer│      │  NAT Gateway │        │
│  │ (443 only)   │      │              │        │
│  └──────┬───────┘      └──────┬───────┘        │
│         │                     │                 │
└─────────┼─────────────────────┼─────────────────┘
          │                     │
┌─────────▼─────────────────────▼─────────────────┐
│            Private Subnet (App Tier)            │
│  ┌──────────────┐      ┌──────────────┐        │
│  │ App Server 1 │      │ App Server 2 │        │
│  │ (Port 3000)  │      │ (Port 3000)  │        │
│  └──────┬───────┘      └──────┬───────┘        │
│         │                     │                 │
└─────────┼─────────────────────┼─────────────────┘
          │                     │
┌─────────▼─────────────────────▼─────────────────┐
│          Private Subnet (Data Tier)             │
│  ┌──────────────┐      ┌──────────────┐        │
│  │  PostgreSQL  │      │    Redis     │        │
│  │ (Port 5432)  │      │ (Port 6379)  │        │
│  └──────────────┘      └──────────────┘        │
│  (NO internet access)  (NO internet access)    │
└─────────────────────────────────────────────────┘
```

### Firewall Rules (Security Groups)

**Load Balancer Security Group:**
```
Inbound:
- Port 443 (HTTPS) from 0.0.0.0/0
- Port 80 (HTTP) from 0.0.0.0/0 (redirect to 443)

Outbound:
- Port 3000 to App Server SG
- Port 443 to internet (for health checks)
```

**App Server Security Group:**
```
Inbound:
- Port 3000 from Load Balancer SG only
- Port 22 (SSH) from Bastion Host SG only

Outbound:
- Port 5432 to Database SG
- Port 6379 to Redis SG
- Port 443 to internet (for API calls, npm packages)
```

**Database Security Group:**
```
Inbound:
- Port 5432 from App Server SG only
- Port 5432 from Bastion Host SG (emergency access)

Outbound:
- NONE (no outbound internet access)
```

**Redis Security Group:**
```
Inbound:
- Port 6379 from App Server SG only

Outbound:
- NONE
```

**Bastion Host Security Group:**
```
Inbound:
- Port 22 from Company VPN IP range only

Outbound:
- Port 22 to App Server SG
- Port 5432 to Database SG
```

---

## 🔐 HTTPS Enforcement

### SSL/TLS Configuration

**Certificate Management:**
- Use AWS Certificate Manager (ACM) / Google-managed SSL / Azure App Service Certificates
- Auto-renewal enabled
- Wildcard certificate: `*.stakeholderradar.com`
- TLS 1.2+ only (disable TLS 1.0, 1.1)

**Load Balancer HTTPS Setup:**
```hcl
# AWS Application Load Balancer
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# HTTP to HTTPS redirect
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

**Application-Level HTTPS:**
```javascript
// Express.js - Force HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

**CDN Configuration:**
```
CloudFront / Cloud CDN:
- Viewer Protocol Policy: Redirect HTTP to HTTPS
- Origin Protocol Policy: HTTPS Only
- Minimum SSL/TLS Version: TLSv1.2
- Cipher Suite: Strong ciphers only
- HTTP/2 and HTTP/3 enabled
```

---

## 🔑 Secrets Management

### Architecture

```
Application Code
    │
    ▼
Environment Variables (reference only)
    │
    ▼
AWS Secrets Manager / GCP Secret Manager / Azure Key Vault
    │
    ├─► Database credentials
    ├─► OAuth client secrets (Slack, Google, Jira)
    ├─► JWT signing keys
    ├─► OAuth encryption keys
    ├─► API keys (third-party services)
    └─► Redis connection strings
```

### Secret Organization

**Naming Convention:**
```
{environment}/{service}/{secret-name}

Examples:
- production/database/master-password
- production/oauth/encryption-key
- production/oauth/slack-client-secret
- production/oauth/google-client-secret
- production/jwt/access-secret
- production/jwt/refresh-secret
- staging/database/master-password
```

### AWS Secrets Manager Configuration

```hcl
# Database master password
resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.environment}/database/master-password"

  tags = {
    Environment = var.environment
    Service     = "database"
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# OAuth encryption key
resource "aws_secretsmanager_secret" "oauth_encryption_key" {
  name = "${var.environment}/oauth/encryption-key"

  rotation_rules {
    automatically_after_days = 90
  }
}

# JWT secrets
resource "aws_secretsmanager_secret" "jwt_access_secret" {
  name = "${var.environment}/jwt/access-secret"

  rotation_rules {
    automatically_after_days = 30
  }
}
```

### Application Integration

```javascript
// backend/config/secrets.js
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });

class SecretsService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async getSecret(secretName) {
    // Check cache
    const cached = this.cache.get(secretName);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.value;
    }

    // Fetch from Secrets Manager
    try {
      const data = await secretsManager.getSecretValue({
        SecretId: `${process.env.ENVIRONMENT}/${secretName}`
      }).promise();

      const value = data.SecretString;

      // Cache the secret
      this.cache.set(secretName, {
        value,
        timestamp: Date.now()
      });

      return value;
    } catch (error) {
      console.error(`Failed to get secret ${secretName}:`, error);
      throw error;
    }
  }

  async getDatabaseCredentials() {
    return await this.getSecret('database/master-password');
  }

  async getOAuthEncryptionKey() {
    return await this.getSecret('oauth/encryption-key');
  }

  async getJWTAccessSecret() {
    return await this.getSecret('jwt/access-secret');
  }
}

module.exports = new SecretsService();
```

### Environment Variables (References Only)

```bash
# .env (DO NOT store actual secrets here)
ENVIRONMENT=production
AWS_REGION=us-east-1

# Reference to secrets (actual values fetched at runtime)
DATABASE_PASSWORD_SECRET=production/database/master-password
OAUTH_ENCRYPTION_KEY_SECRET=production/oauth/encryption-key
JWT_ACCESS_SECRET_SECRET=production/jwt/access-secret
JWT_REFRESH_SECRET_SECRET=production/jwt/refresh-secret
SLACK_CLIENT_SECRET_SECRET=production/oauth/slack-client-secret
```

---

## 🔥 Firewall & Network Rules

### VPC Configuration

```hcl
# VPC with public and private subnets
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "stakeholder-radar-${var.environment}"
    Environment = var.environment
  }
}

# Public subnets (for load balancer)
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${count.index + 1}"
    Type = "public"
  }
}

# Private subnets (for app servers)
resource "aws_subnet" "private_app" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-app-${count.index + 1}"
    Type = "private-app"
  }
}

# Private subnets (for database)
resource "aws_subnet" "private_data" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 20}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-data-${count.index + 1}"
    Type = "private-data"
  }
}
```

### Network ACLs (Additional Layer)

```hcl
# Public subnet NACL
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  # Allow HTTPS inbound
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow HTTP inbound (for redirect)
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Allow return traffic
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow all outbound
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }
}

# Private app subnet NACL
resource "aws_network_acl" "private_app" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private_app[*].id

  # Allow from load balancer subnet
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 3000
    to_port    = 3000
  }

  # Allow return traffic
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow all outbound
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }
}
```

### WAF (Web Application Firewall)

```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "stakeholder-radar-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting
  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # AWS managed rules
  rule {
    name     = "aws-managed-rules"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "aws-managed-rules"
      sampled_requests_enabled   = true
    }
  }

  # SQL injection protection
  rule {
    name     = "sql-injection"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "sql-injection"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "waf-metrics"
    sampled_requests_enabled   = true
  }
}
```

---

## 📊 Monitoring & Alerting

### CloudWatch Dashboards

```hcl
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "stakeholder-radar-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      # Application metrics
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average" }],
            [".", "RequestCount", { stat = "Sum" }],
            [".", "HTTPCode_Target_5XX_Count", { stat = "Sum" }],
            [".", "HTTPCode_Target_4XX_Count", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Application Load Balancer Metrics"
        }
      },
      # Database metrics
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            [".", "DatabaseConnections", { stat = "Sum" }],
            [".", "FreeableMemory", { stat = "Average" }],
            [".", "ReadLatency", { stat = "Average" }],
            [".", "WriteLatency", { stat = "Average" }]
          ]
          period = 300
          region = var.aws_region
          title  = "RDS Metrics"
        }
      },
      # Cache metrics
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", { stat = "Average" }],
            [".", "CacheHits", { stat = "Sum" }],
            [".", "CacheMisses", { stat = "Sum" }],
            [".", "NetworkBytesIn", { stat = "Sum" }],
            [".", "NetworkBytesOut", { stat = "Sum" }]
          ]
          period = 300
          region = var.aws_region
          title  = "ElastiCache Metrics"
        }
      }
    ]
  })
}
```

### CloudWatch Alarms

```hcl
# High error rate alarm
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "${var.environment}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "This metric monitors 5XX errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# High response time alarm
resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "${var.environment}-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Average"
  threshold           = 2.0  # 2 seconds
  alarm_description   = "This metric monitors response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# Database CPU alarm
resource "aws_cloudwatch_metric_alarm" "db_cpu_high" {
  alarm_name          = "${var.environment}-db-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Database CPU is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
}

# Database connection alarm
resource "aws_cloudwatch_metric_alarm" "db_connections_high" {
  alarm_name          = "${var.environment}-db-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Database connections are high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# Disk space alarm
resource "aws_cloudwatch_metric_alarm" "db_storage_low" {
  alarm_name          = "${var.environment}-db-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240  # 10 GB
  alarm_description   = "Database storage is low"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# Application unhealthy targets
resource "aws_cloudwatch_metric_alarm" "unhealthy_targets" {
  alarm_name          = "${var.environment}-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Application has unhealthy targets"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"
}
```

### SNS Alert Configuration

```hcl
resource "aws_sns_topic" "alerts" {
  name = "stakeholder-radar-${var.environment}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_subscription" "slack" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.slack_notifier.arn
}
```

### Application-Level Monitoring

```javascript
// backend/services/monitoring.js
const cloudwatch = new AWS.CloudWatch();

class MonitoringService {
  async recordMetric(metricName, value, unit = 'Count') {
    await cloudwatch.putMetricData({
      Namespace: 'StakeholderRadar/Application',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.ENVIRONMENT
          }
        ]
      }]
    }).promise();
  }

  async recordAPICall(endpoint, duration, statusCode) {
    await this.recordMetric('APICall', 1);
    await this.recordMetric(`API_${endpoint}`, 1);
    await this.recordMetric('APILatency', duration, 'Milliseconds');

    if (statusCode >= 500) {
      await this.recordMetric('APIError', 1);
    }
  }

  async recordOAuthEvent(provider, event, success) {
    await this.recordMetric(`OAuth_${provider}_${event}`, 1);
    if (!success) {
      await this.recordMetric(`OAuth_${provider}_Error`, 1);
    }
  }

  async recordDatabaseQuery(duration) {
    await this.recordMetric('DatabaseQuery', 1);
    await this.recordMetric('DatabaseQueryLatency', duration, 'Milliseconds');
  }
}

module.exports = new MonitoringService();
```

---

## 💾 Automated Database Backups

### AWS RDS Automated Backups

```hcl
resource "aws_db_instance" "main" {
  identifier = "stakeholder-radar-${var.environment}"

  # Backup configuration
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"  # UTC
  maintenance_window     = "mon:04:00-mon:05:00"  # UTC

  # Point-in-time recovery
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Multi-AZ for production
  multi_az = var.environment == "production" ? true : false

  # Encryption
  storage_encrypted = true
  kms_key_id       = aws_kms_key.rds.arn

  # Deletion protection
  deletion_protection = var.environment == "production" ? true : false

  # Automatic minor version upgrades
  auto_minor_version_upgrade = true

  tags = {
    Environment = var.environment
    Backup      = "automated"
  }
}
```

### Manual Snapshot Lambda

```python
# lambda/daily_snapshot.py
import boto3
import datetime

rds = boto3.client('rds')

def lambda_handler(event, context):
    """Create manual RDS snapshot daily"""

    db_instance = os.environ['DB_INSTANCE_ID']
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d-%H-%M')
    snapshot_id = f'{db_instance}-manual-{timestamp}'

    try:
        response = rds.create_db_snapshot(
            DBSnapshotIdentifier=snapshot_id,
            DBInstanceIdentifier=db_instance,
            Tags=[
                {'Key': 'Type', 'Value': 'Manual'},
                {'Key': 'CreatedBy', 'Value': 'Lambda'},
                {'Key': 'Date', 'Value': timestamp}
            ]
        )

        print(f'Snapshot created: {snapshot_id}')
        return {
            'statusCode': 200,
            'body': f'Snapshot {snapshot_id} created successfully'
        }
    except Exception as e:
        print(f'Error creating snapshot: {str(e)}')
        raise
```

```hcl
# Lambda function for daily snapshots
resource "aws_lambda_function" "daily_snapshot" {
  filename      = "lambda/daily_snapshot.zip"
  function_name = "rds-daily-snapshot-${var.environment}"
  role          = aws_iam_role.lambda_snapshot.arn
  handler       = "daily_snapshot.lambda_handler"
  runtime       = "python3.9"
  timeout       = 300

  environment {
    variables = {
      DB_INSTANCE_ID = aws_db_instance.main.id
    }
  }
}

# CloudWatch event rule for daily execution
resource "aws_cloudwatch_event_rule" "daily_snapshot" {
  name                = "daily-snapshot-${var.environment}"
  description         = "Trigger daily RDS snapshot"
  schedule_expression = "cron(0 2 * * ? *)"  # 2 AM UTC daily
}

resource "aws_cloudwatch_event_target" "daily_snapshot" {
  rule      = aws_cloudwatch_event_rule.daily_snapshot.name
  target_id = "lambda"
  arn       = aws_lambda_function.daily_snapshot.arn
}
```

### Backup Retention & Lifecycle

```hcl
# Automated backup lifecycle
resource "aws_backup_vault" "main" {
  name = "stakeholder-radar-${var.environment}"

  tags = {
    Environment = var.environment
  }
}

resource "aws_backup_plan" "main" {
  name = "stakeholder-radar-backup-plan"

  rule {
    rule_name         = "daily_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)"  # 2 AM UTC daily

    lifecycle {
      delete_after = var.environment == "production" ? 30 : 7
      cold_storage_after = var.environment == "production" ? 7 : null
    }
  }

  rule {
    rule_name         = "weekly_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)"  # 3 AM UTC every Sunday

    lifecycle {
      delete_after = var.environment == "production" ? 90 : null
    }
  }
}

resource "aws_backup_selection" "rds" {
  name         = "rds-backup-selection"
  plan_id      = aws_backup_plan.main.id
  iam_role_arn = aws_iam_role.backup.arn

  resources = [
    aws_db_instance.main.arn
  ]
}
```

### Backup Monitoring

```hcl
# Alarm for backup failures
resource "aws_cloudwatch_metric_alarm" "backup_failed" {
  alarm_name          = "${var.environment}-backup-failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = 3600
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Backup job failed"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"
}
```

---

## 🔐 IAM Permissions (Least Privilege)

### Service Roles

**EC2/App Server Role:**
```hcl
resource "aws_iam_role" "app_server" {
  name = "stakeholder-radar-app-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "app_server" {
  name = "app-server-policy"
  role = aws_iam_role.app_server.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Secrets Manager - Read only specific secrets
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/*"
        ]
      },
      # CloudWatch - Write metrics and logs
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      },
      # S3 - Read/write to app bucket only
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.app.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.app.arn
        ]
      }
    ]
  })
}
```

**Lambda Backup Role:**
```hcl
resource "aws_iam_role" "lambda_snapshot" {
  name = "lambda-snapshot-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_snapshot" {
  name = "lambda-snapshot-policy"
  role = aws_iam_role.lambda_snapshot.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # RDS - Create snapshots only
      {
        Effect = "Allow"
        Action = [
          "rds:CreateDBSnapshot",
          "rds:DescribeDBSnapshots",
          "rds:AddTagsToResource"
        ]
        Resource = "*"
      },
      # CloudWatch Logs
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}
```

**RDS Enhanced Monitoring Role:**
```hcl
resource "aws_iam_role" "rds_monitoring" {
  name = "rds-monitoring-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

### User Policies

**Developer Access (Staging Only):**
```hcl
resource "aws_iam_policy" "developer" {
  name = "developer-staging-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # EC2 - Read only
      {
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "elasticloadbalancing:Describe*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      },
      # RDS - Read only
      {
        Effect = "Allow"
        Action = [
          "rds:Describe*",
          "rds:ListTagsForResource"
        ]
        Resource = "*"
      },
      # CloudWatch - Read metrics and logs
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
          "logs:FilterLogEvents",
          "logs:GetLogEvents"
        ]
        Resource = "*"
      },
      # Secrets - Read staging secrets only
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:staging/*"
        ]
      },
      # DENY production access
      {
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = "production"
          }
        }
      }
    ]
  })
}
```

**DevOps Full Access:**
```hcl
resource "aws_iam_policy" "devops" {
  name = "devops-full-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Full access to infrastructure
      {
        Effect = "Allow"
        Action = [
          "ec2:*",
          "rds:*",
          "elasticloadbalancing:*",
          "cloudwatch:*",
          "logs:*",
          "s3:*",
          "iam:PassRole"
        ]
        Resource = "*"
      },
      # Secrets Manager
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:*"
        ]
        Resource = "*"
      },
      # DENY IAM user/role modifications
      {
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:DeleteUser",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:PutUserPolicy",
          "iam:PutRolePolicy"
        ]
        Resource = "*"
      }
    ]
  })
}
```

---

This architecture provides enterprise-grade security with defense-in-depth, automated operations, and comprehensive monitoring. Continue to part 2 for infrastructure as code templates and deployment guide.
