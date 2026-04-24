# Deployment Guide

Complete guide to deploy School Management System to production.

## 📋 Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database schema migrated
- [ ] Tests passing
- [ ] Code reviewed and merged
- [ ] Supabase production project created
- [ ] Domain registered and DNS configured
- [ ] SSL certificate obtained
- [ ] Monitoring set up
- [ ] Backup strategy in place

## 🚀 Deployment Options

### Option 1: Traditional VPS (Recommended)

#### Using Ubuntu Server + Nginx

**1. Initial Setup**

```bash
# SSH into server
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL client
apt install -y postgresql-client

# Install Nginx
apt install -y nginx

# Install certbot for SSL
apt install -y certbot python3-certbot-nginx

# Create app user
adduser appuser
usermod -aG sudo appuser
```

**2. Setup Backend**

```bash
# Login as appuser
su - appuser

# Clone repository
git clone <repo-url> school-management-system
cd school-management-system/backend

# Install dependencies
npm install

# Build
npm run build

# Create .env file
nano .env
# Add all production variables

# Start with PM2
npm install -g pm2
pm2 start npm --name "school-api" -- start
pm2 startup
pm2 save
```

**3. Setup Frontend**

```bash
cd ../frontend

# Install dependencies
npm install

# Build Next.js
npm run build

# Create .env.local
nano .env.local
# Add production variables

# Start with PM2
pm2 start npm --name "school-web" -- start
```

**4. Configure Nginx**

Create `/etc/nginx/sites-available/school-management`:

```nginx
# Backend API
upstream api_backend {
    server 127.0.0.1:5000;
}

# Frontend
upstream next_frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://next_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/school-management /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

**5. Setup SSL Certificates**

```bash
certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com
```

### Option 2: Docker with Docker Compose

**1. Create Dockerfile for Backend**

```dockerfile
# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

**2. Create Dockerfile for Frontend**

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
```

**3. Docker Compose Configuration**

```yaml
# docker-compose.yml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: school_management
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    networks:
      - school-network

  backend:
    build: ./backend
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: school_management
      JWT_SECRET: ${JWT_SECRET}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
    depends_on:
      - postgres
    ports:
      - "5000:5000"
    networks:
      - school-network

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:5000/api
      NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
    depends_on:
      - backend
    ports:
      - "3000:3000"
    networks:
      - school-network

volumes:
  postgres_data:

networks:
  school-network:
    driver: bridge
```

**Run with Docker Compose:**

```bash
cp .env.example .env
docker-compose up -d
```

### Option 3: Cloud Platforms

#### Vercel (Frontend)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

#### Render (Backend)

1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy

## 🔐 Security Checklist

### Database

- [ ] Strong database password (32+ characters)
- [ ] Restricted database access (firewall rules)
- [ ] Regular backups enabled
- [ ] Encryption at rest enabled

### API

- [ ] HTTPS/SSL enabled
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified

### Frontend

- [ ] Sensitive data not in localStorage
- [ ] API calls use HTTPS
- [ ] Environment variables not exposed
- [ ] Content Security Policy headers set

### General

- [ ] Secrets not in version control
- [ ] Environment variables secured
- [ ] Access logs monitored
- [ ] Security headers configured
- [ ] Regular security updates applied

## 📊 Monitoring & Logging

### PM2 Monitoring

```bash
# Install PM2 Plus (optional)
pm2 plus

# View logs
pm2 logs

# Monitor
pm2 monit
```

### Application Logging

Backend logs are output to console and can be redirected:

```bash
pm2 start npm --name "school-api" -- start --output /var/log/school-api.log --error /var/log/school-api-error.log
```

### Database Backups

Automatic backups every 24 hours:

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/school_management"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

pg_dump -h $DB_HOST -U $DB_USER school_management | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

Schedule with cron:

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## 📈 Performance Optimization

### Frontend

- Enable Next.js image optimization
- Configure ISR (Incremental Static Regeneration)
- Implement lazy loading
- Minify CSS/JavaScript
- Use CDN for static assets

### Backend

- Enable connection pooling
- Cache frequently accessed data
- Implement API pagination
- Compress responses with gzip
- Use database indexes

### Database

- Analyze query performance
- Create indexes on foreign keys
- Archive old data
- Optimize storage usage

## 🆘 Troubleshooting

### API Connection Errors

```bash
# Check if backend is running
curl http://localhost:5000/health

# Check database connection
psql -h $DB_HOST -U $DB_USER -d school_management -c "SELECT 1"

# View PM2 logs
pm2 logs
```

### Database Issues

```bash
# Check database size
psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('school_management'));"

# Vacuum database
psql -U postgres -d school_management -c "VACUUM ANALYZE"
```

### Frontend Build Issues

```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

## 📋 Post-Deployment Steps

1. **Verify Deployment**
   - [ ] API responding at `/health`
   - [ ] Frontend loading correctly
   - [ ] Login/signup working
   - [ ] Database queries working

2. **Configure DNS**
   - [ ] Point domain to server
   - [ ] Set up SSL certificates
   - [ ] Test HTTPS access

3. **Setup Monitoring**
   - [ ] Configure error tracking
   - [ ] Setup performance monitoring
   - [ ] Set up log aggregation

4. **Create Admin Account**
   - [ ] Create first admin user
   - [ ] Reset admin password if needed

5. **Backup Strategy**
   - [ ] Configure daily backups
   - [ ] Test restore procedure
   - [ ] Document backup location

## 🔄 Continuous Deployment

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy Backend
        run: |
          ssh appuser@${{ secrets.SERVER_IP }} << 'EOF'
            cd school-management-system/backend
            git pull
            npm install
            npm run build
            pm2 restart school-api
          EOF

      - name: Deploy Frontend
        run: |
          ssh appuser@${{ secrets.SERVER_IP }} << 'EOF'
            cd school-management-system/frontend
            git pull
            npm install
            npm run build
            pm2 restart school-web
          EOF
```

## 📞 Support

For deployment issues:

1. Check logs: `pm2 logs`
2. Check database: `psql`
3. Check Nginx: `sudo systemctl status nginx`
4. Check firewall: `sudo ufw status`
5. Mail support team

---

**Last Updated**: February 2026
