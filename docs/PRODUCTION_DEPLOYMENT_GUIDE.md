# Production Deployment Guide - Multi-Tenant SaaS Platform

This guide covers deploying the multi-tenant school management system to AWS EC2 with full production setup.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Infrastructure Setup](#aws-infrastructure-setup)
3. [EC2 Instance Configuration](#ec2-instance-configuration)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Nginx Configuration](#nginx-configuration)
8. [Monitoring & Logging](#monitoring--logging)
9. [Scaling & Auto-Recovery](#scaling--auto-recovery)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- AWS Account with appropriate permissions
- Domain name with DNS control (e.g., ventionz.com)
- SSH key pair for EC2 access
- Basic knowledge of Linux, Docker, and AWS services
- Terraform (optional but recommended)

---

## AWS Infrastructure Setup

### 1. Create VPC and Subnets

```bash
# Using AWS CLI
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=schools-vpc}]'

# Create public subnet
aws ec2 create-subnet \
  --vpc-id vpc-xxxxxxxx \
  --cidr-block 10.0.1.0/24 \
  --region us-east-1

# Create private subnet (for RDS)
aws ec2 create-subnet \
  --vpc-id vpc-xxxxxxxx \
  --cidr-block 10.0.2.0/24 \
  --region us-east-1
```

### 2. Create Security Groups

```bash
# Main application security group
aws ec2 create-security-group \
  --group-name schools-app-sg \
  --description "App server security group" \
  --vpc-id vpc-xxxxxxxx

# Add ingress rules
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32

# Database security group
aws ec2 create-security-group \
  --group-name schools-db-sg \
  --description "Database security group" \
  --vpc-id vpc-xxxxxxxx

aws ec2 authorize-security-group-ingress \
  --group-id sg-db-xxxxxxxx \
  --protocol tcp \
  --port 5432 \
  --source-security-group-id sg-xxxxxxxx
```

### 3. Create RDS PostgreSQL Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier schools-prod-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username ${DB_USER} \
  --master-user-password ${DB_PASSWORD} \
  --allocated-storage 100 \
  --storage-type gp3 \
  --backup-retention-period 30 \
  --multi-az \
  --vpc-security-group-ids sg-db-xxxxxxxx \
  --db-subnet-group-name schools-db-subnet \
  --publicly-accessible false \
  --enable-cloudwatch-logs-exports postgresql
```

### 4. Create ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id schools-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --security-group-ids sg-redis-xxxxxxxx \
  --automatic-failover-enabled \
  --backup-retention-limit 7
```

### 5. Register Domain & Create Route53 Records

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name ventionz.com \
  --caller-reference ventionz-zone-1

# Get ALB DNS name and create alias record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-records.json
```

**dns-records.json:**

```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "*.ventionz.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "alb-xxxxxxx.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "ventionz.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "alb-xxxxxxx.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
```

---

## EC2 Instance Configuration

### 1. Launch EC2 Instance

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.xlarge \
  --key-name my-keypair \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx \
  --iam-instance-profile Name=EC2-Docker-Role \
  --root-volume-size 150 \
  --root-volume-type gp3 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=schools-app-prod}]'
```

### 2. SSH into Instance and Install Dependencies

```bash
ssh -i my-keypair.pem ec2-user@your-ec2-ip

# Update system
sudo yum update -y

# Install Docker
sudo amazon-linux-extras install docker -y
sudo usermod -a -G docker ec2-user
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo yum install git -y

# Install Certbot for SSL
sudo yum install certbot python3-certbot-nginx -y

# Create application directory
sudo mkdir -p /opt/schools
sudo chown -R ec2-user:ec2-user /opt/schools
cd /opt/schools
```

### 3. Clone Repository

```bash
cd /opt/schools
git clone https://github.com/yourusername/schools.git .
git checkout main
```

### 4. Create Environment Files

```bash
# Create .env.production
cat > .env.production <<EOF
# Node Environment
NODE_ENV=production

# Server
PORT=5000

# Database (RDS endpoint)
DB_HOST=schools-prod-db.c9akciq32.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=schools_production

# Redis (ElastiCache endpoint)
REDIS_URL=redis://:${REDIS_PASSWORD}@schools-redis.abc123.ng.0001.use1.cache.amazonaws.com:6379

# JWT
JWT_SECRET=your-super-secret-key-change-this

# URLs
FRONTEND_URL=https://ventionz.com
API_URL=https://api.ventionz.com

# AWS S3 (for file uploads)
AWS_REGION=us-east-1
AWS_BUCKET=schools-uploads-prod
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_KEY}

# Multi-tenancy
DEVELOPMENT_MODE_TENANT=demo
MULTI_TENANT_ENABLED=true

# Logging
LOG_LEVEL=info
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=${SENDGRID_API_KEY}
EOF

# Ensure .env is not in git
echo ".env.production" >> .gitignore
```

---

## Database Setup

### 1. Initialize Database

```bash
# Install psql client
sudo yum install postgresql -y

# Connect to RDS and run migrations
psql -h schools-prod-db.c9akciq32.us-east-1.rds.amazonaws.com \
  -U ${DB_USER} \
  -d schools_production \
  -f database/schema.sql

# Apply multi-tenancy migration
psql -h schools-prod-db.c9akciq32.us-east-1.rds.amazonaws.com \
  -U ${DB_USER} \
  -d schools_production \
  -f database/migrations/20260226_add_multi_tenancy.sql

# Seed initial data
psql -h schools-prod-db.c9akciq32.us-east-1.rds.amazonaws.com \
  -U ${DB_USER} \
  -d schools_production \
  -f database/seed-sample-data.sql
```

### 2. Create Initial Tenants

```bash
psql -h schools-prod-db.c9akciq32.us-east-1.rds.amazonaws.com \
  -U ${DB_USER} \
  -d schools_production <<EOF
  -- Create initial tenants
  INSERT INTO tenants (name, slug, subdomain, status, subscription_tier)
  VALUES
    ('Demo School', 'demo', 'demo', 'active', 'enterprise'),
    ('Platform Admin', 'admin', 'admin', 'active', 'enterprise');

  -- Create super admin user
  INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_super_admin, status)
  SELECT
    'admin@ventionz.com',
    '\$2b\$10\$...',
    'Platform',
    'Admin',
    (SELECT id FROM roles WHERE name = 'admin'),
    TRUE,
    'active'
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@ventionz.com');
EOF
```

---

## Application Deployment

### 1. Build Docker Images

```bash
cd /opt/schools

# Build backend
docker build -t schools-backend:latest -f backend/Dockerfile backend/

# Build frontend
docker build -t schools-frontend:latest -f frontend/Dockerfile frontend/

# Tag for ECR or Docker Hub
docker tag schools-backend:latest your-registry/schools-backend:latest
docker tag schools-frontend:latest your-registry/schools-frontend:latest

# Push to registry
docker push your-registry/schools-backend:latest
docker push your-registry/schools-frontend:latest
```

### 2. Deploy with Docker Compose

```bash
# Load environment variables
export $(cat .env.production | grep -v '#' | xargs)

# Create logs directory
mkdir -p /opt/schools/logs
mkdir -p /opt/schools/infrastructure/certbot/{conf,www}

# Start services
docker-compose -f infrastructure/docker-compose.prod.yml up -d

# Check status
docker-compose -f infrastructure/docker-compose.prod.yml ps

# View logs
docker-compose -f infrastructure/docker-compose.prod.yml logs -f nginx
docker-compose -f infrastructure/docker-compose.prod.yml logs -f backend-1
```

---

## SSL/TLS Configuration

### 1. Generate Wildcard Certificate

```bash
# Create certificate
sudo certbot certonly --manual \
  -d ventionz.com -d "*.ventionz.com" \
  --preferred-challenges dns \
  --server https://acme-v02.api.letsencrypt.org/directory

# Follow DNS verification steps
# Then copy certificate to Docker volume
sudo cp /etc/letsencrypt/live/ventionz.com/fullchain.pem /opt/schools/infrastructure/certbot/conf/
sudo cp /etc/letsencrypt/live/ventionz.com/privkey.pem /opt/schools/infrastructure/certbot/conf/

# Set permissions
sudo chown -R ec2-user:ec2-user /opt/schools/infrastructure/certbot/
```

### 2. Auto-Renewal

```bash
# Certbot automatically renews via Docker
# Verify renewal will work
sudo certbot renew --dry-run
```

---

## Nginx Configuration

### 1. Deploy Nginx Config

```bash
# Copy to container
docker cp infrastructure/nginx/multi-tenant.conf schools_nginx:/etc/nginx/nginx.conf

# Test configuration
docker exec schools_nginx nginx -t

# Reload
docker exec schools_nginx nginx -s reload
```

### 2. Set Up SSL

Nginx config already includes wildcard SSL setup. Verify:

```bash
# Check certificate loading
docker exec schools_nginx openssl s_client -connect localhost:443
```

---

## Monitoring & Logging

### 1. CloudWatch Logs

```bash
# View logs in CloudWatch
aws logs describe-log-groups

aws logs start-query \
  --log-group-name /schools/app \
  --start-time `date -d '2 hours ago' +%s`.000 \
  --end-time `date +%s`.000 \
  --query-string 'fields @timestamp, @message | stats count() by @message'
```

### 2. Set Up CloudWatch Alarms

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name schools-high-error-rate \
  --alarm-description "Alert when error rate is high" \
  --metric-name ErrorCount \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:schools-alerts
```

### 3. Application Performance Monitoring (APM)

```bash
# Using DataDog or New Relic
# Add to backend Dockerfile:
# RUN npm install @datadog/browser-rum
# SET DD_TRACE_ENABLED=true
```

---

## Scaling & Auto-Recovery

### 1. Create Auto Scaling Group

```bash
# Create launch template
aws ec2 create-launch-template \
  --launch-template-name schools-template \
  --version-description "Production template" \
  --launch-template-data file://launch-template.json

# Create auto scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name schools-asg \
  --launch-template LaunchTemplateName=schools-template,Version='$Latest' \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3 \
  --vpc-zone-identifier "subnet-xxxxxxxx,subnet-yyyyyyyy"
```

### 2. Load Balancer Health Checks

```bash
# health check configured in Nginx
# Endpoint: /health (returns 200 OK)
```

### 3. Service Recovery

```bash
# Docker restart policies ensure container recovery
# SystemD unit file for automatic startup:

cat > /etc/systemd/system/schools-docker.service <<EOF
[Unit]
Description=Schools Docker Services
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/schools
ExecStart=/usr/local/bin/docker-compose -f infrastructure/docker-compose.prod.yml up -d
RemainAfterExit=yes
ExecStop=/usr/local/bin/docker-compose -f infrastructure/docker-compose.prod.yml down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable schools-docker
```

---

## Troubleshooting

### Check Services

```bash
# Container status
docker-compose -f infrastructure/docker-compose.prod.yml ps

# Container logs
docker-compose -f infrastructure/docker-compose.prod.yml logs backend-1

# Network connectivity
docker exec schools_backend_1 ping postgres
docker exec schools_backend_1 redis-cli -u redis://:password@redis ping

# Database connectivity
docker exec schools_backend_1 psql -h postgres -U ${DB_USER} -c "SELECT version();"
```

### Common Issues

| Issue                       | Solution                                                                |
| --------------------------- | ----------------------------------------------------------------------- |
| 502 Bad Gateway             | Check backend health: `docker logs schools_backend_1`                   |
| SSL Certificate Error       | Verify cert path in nginx.conf and renew if expired                     |
| High Memory Usage           | Scale up instance or add more workers: `docker-compose scale backend=5` |
| Database Connection Timeout | Check RDS security group allows inbound from EC2                        |
| Slowapi Requests            | Check Redis connection and database indexes                             |

---

## Maintenance

### Regular Tasks

```bash
# Daily: Check logs
tail -f /var/log/nginx/error.log

# Weekly: Backup database
pg_dump -Fc schools_production > backup-$(date +%Y%m%d).dump

# Monthly: Update containers
docker-compose -f infrastructure/docker-compose.prod.yml pull
docker-compose -f infrastructure/docker-compose.prod.yml up -d

# Monitor disk space
df -h
```

---

## Summary

Your multi-tenant system is now deployed on production with:

✅ Multi-region resilience  
✅ Automatic scaling  
✅ SSL/TLS encryption  
✅ Load balancing  
✅ Database replication  
✅ Monitoring & alerting  
✅ Auto-recovery  
✅ Backup & restore

For additional support, see [Deployment.md](../docs/DEPLOYMENT.md) and [API.md](../docs/API.md).
