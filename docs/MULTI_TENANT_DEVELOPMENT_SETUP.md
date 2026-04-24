# Local Development Setup for Multi-Tenant School Management System

This guide explains how to set up the multi-tenant system for local development with support for multiple school subdomains.

## Overview

The system supports two approaches for local development:

1. **Subdomain-based** (Recommended): `school1.localhost:3000`
2. **Query parameter-based**: `localhost:3000?tenant=school1`

---

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Docker (optional but recommended)
- Git

---

## Step 1: Configure Hosts File (Subdomain Method)

To use subdomain routing on localhost, update your hosts file to resolve local subdomains to 127.0.0.1.

### Windows

Edit `C:\Windows\System32\drivers\etc\hosts` as Administrator:

```
127.0.0.1 localhost
127.0.0.1 demo.localhost
127.0.0.1 school1.localhost
127.0.0.1 school2.localhost
127.0.0.1 admin.localhost
```

### macOS / Linux

Edit `/etc/hosts` with sudo:

```bash
sudo nano /etc/hosts
```

Add:

```
127.0.0.1 localhost
127.0.0.1 demo.localhost
127.0.0.1 school1.localhost
127.0.0.1 school2.localhost
127.0.0.1 admin.localhost
```

Save (Ctrl+X, Y, Enter on nano).

---

## Step 2: Database Setup

### Option A: PostgreSQL Local Installation

```bash
# Create database
createdb schools_development

# Load schema
psql schools_development < database/schema.sql

# Run migration for multi-tenancy
psql schools_development < database/migrations/20260226_add_multi_tenancy.sql

# Seed demo data (optional)
psql schools_development < database/seed-sample-data.sql
```

### Option B: Docker (Recommended)

```bash
# Create docker-compose.yml in project root
docker-compose up -d

# Apply migrations
docker exec schools_db psql -U schools_user -d schools_development \
  -f /migrations/20260226_add_multi_tenancy.sql
```

**docker-compose.yml:**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    container_name: schools_db
    environment:
      POSTGRES_USER: schools_user
      POSTGRES_PASSWORD: schools_password
      POSTGRES_DB: schools_development
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/migrations:/migrations

volumes:
  postgres_data:
```

---

## Step 3: Initialize Demo Tenants

Run this SQL to create demo tenants:

```sql
-- Create demo tenant
INSERT INTO tenants (name, slug, subdomain, status, subscription_tier, max_users, max_students)
VALUES
  ('Demo School', 'demo', 'demo', 'active', 'basic', 100, 1000),
  ('School One', 'school1', 'school1', 'active', 'pro', 200, 2000),
  ('School Two', 'school2', 'school2', 'active', 'pro', 200, 2000);

-- Create super admin user (for platform admin)
INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_super_admin, status)
SELECT
  'admin@ventionz.com',
  '$2b$10$...', -- bcrypt hash of "admin123"
  'Platform',
  'Admin',
  (SELECT id FROM roles WHERE name = 'admin'),
  TRUE,
  'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@ventionz.com');

-- Create super_admin record
INSERT INTO super_admins (user_id)
SELECT id FROM users WHERE email = 'admin@ventionz.com'
AND NOT EXISTS (SELECT 1 FROM super_admins WHERE user_id = (SELECT id FROM users WHERE email = 'admin@ventionz.com'));

-- Create demo tenant admin users
INSERT INTO users (email, password_hash, first_name, last_name, role_id, tenant_id, status)
VALUES
  ('admin@demo.school', 'HASHED_PASSWORD_HERE', 'Demo', 'Admin', (SELECT id FROM roles WHERE name = 'admin'), (SELECT id FROM tenants WHERE slug = 'demo'), 'active'),
  ('admin@school1.school', 'HASHED_PASSWORD_HERE', 'School1', 'Admin', (SELECT id FROM roles WHERE name = 'admin'), (SELECT id FROM tenants WHERE slug = 'school1'), 'active'),
  ('admin@school2.school', 'HASHED_PASSWORD_HERE', 'School2', 'Admin', (SELECT id FROM roles WHERE name = 'admin'), (SELECT id FROM tenants WHERE slug = 'school2'), 'active');
```

---

## Step 4: Backend Configuration

### Create `.env` file in `/backend`:

```bash
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=schools_user
DB_PASSWORD=schools_password
DB_NAME=schools_development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Multi-tenancy: Default tenant for development mode
DEVELOPMENT_MODE_TENANT=demo

# Supabase (if using)
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# File upload (S3 or local)
FILE_STORAGE=local
UPLOAD_DIR=./uploads
```

### Start Backend:

```bash
cd backend
npm install
npm run dev
```

Backend now available at:

- `http://localhost:5000/api`

---

## Step 5: Frontend Configuration

### Create `.env.local` file in `/frontend`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Multi-tenant tenant detection
NEXT_PUBLIC_MULTI_TENANT_ENABLED=true

# Development
NEXT_PUBLIC_DEBUG=true
```

### Start Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend now available at:

- `http://localhost:3000`
- `http://demo.localhost:3000`
- `http://school1.localhost:3000`
- `http://school2.localhost:3000`

---

## Step 6: Accessing Different Tenants

### Via Subdomain (Recommended)

```
http://demo.localhost:3000          → Demo School tenant
http://school1.localhost:3000       → School One tenant
http://school2.localhost:3000       → School Two tenant
http://admin.localhost:3000         → Super Admin dashboard (optional)
```

### Via Query Parameter

If subdomain routing doesn't work:

```
http://localhost:3000?tenant=demo    → Demo School
http://localhost:3000?tenant=school1 → School One
http://localhost:3000?tenant=school2 → School Two
```

---

## Step 7: Test Multi-Tenancy

### Login to Different Tenants

**Demo School Admin:**

```bash
POST http://demo.localhost:3000/api/auth/login
{
  "email": "admin@demo.school",
  "password": "password123"
}
```

**School One Admin:**

```bash
POST http://school1.localhost:3000/api/auth/login
{
  "email": "admin@school1.school",
  "password": "password123"
}
```

### Verify Data Isolation

1. Create a student in Demo School
2. Switch to School One
3. Verify student does NOT appear

```bash
# Demo School - Create student
POST http://demo.localhost:3000/api/students
Authorization: Bearer DEMO_TOKEN
{
  "userId": "...",
  "admissionNumber": "DEMO001",
  "admissionDate": "2024-01-15",
  "dateOfBirth": "2010-05-22"
}

# School One - List students (should NOT include demo student)
GET http://school1.localhost:3000/api/students
Authorization: Bearer SCHOOL1_TOKEN
```

---

## Step 8: Seeding With Sample Data (Optional)

```bash
cd backend

# Seed all demo tenants with sample data
npm run seed:multi-tenant

# Or seed individual tenant
npm run seed -- --tenant=demo
npm run seed -- --tenant=school1
```

---

## Development Workflow

### Creating New Features

1. **For single-tenant context**: Always use `req.tenantId` from middleware
2. **Use repositories**: Extend `BaseRepository` for new entities
3. **Queries**: All queries automatically scoped via `StudentRepository`, etc.

Example:

```typescript
// controller.ts
export const getStudents = asyncHandler(async (req: TenantRequest, res) => {
  const repo = new StudentRepository(req.tenantId); // Tenant context included
  const students = await repo.findAll();
  // Returns only students from current tenant
});
```

### Testing Multi-Tenancy

```bash
# Run tests for all tenants
npm run test:multi-tenant

# Test data isolation
npm run test:tenant-isolation

# Performance test
npm run test:performance
```

---

## Switching Between API Modes

### 1. Subdomain-Based (Production)

```bash
# .env
MULTI_TENANT_MODE=subdomain
```

Requests: `https://school1.ventionz.com/api/students`

### 2. Query Parameter-Based (Development)

```bash
# .env
MULTI_TENANT_MODE=query
DEVELOPMENT_MODE_TENANT=demo
```

Requests: `http://localhost:5000/api/students?tenant=school1`

### 3. Path-Based (Alternative)

```bash
# .env
MULTI_TENANT_MODE=path
```

Requests: `http://localhost:5000/api/t/school1/students`

---

## Troubleshooting

### Subdomain Not Resolving

**Problem**: `ERR_INVALID_BACKSLASH_ESCAPE` or ERR_NAME_NOT_RESOLVED

**Solution**:

- Verify hosts file entries
- Clear DNS cache:
  - Windows: `ipconfig /flushdns`
  - macOS: `dscacheutil -flushcache`
  - Linux: `sudo systemctl restart systemd-resolved`

### 401 Tenant Context Required

**Problem**: Getting "Tenant context required" on login

**Solution**:

- Check you're accessing via correct subdomain
- Verify tenant exists in database:
  ```sql
  SELECT * FROM tenants WHERE subdomain = 'demo';
  ```

### CORS Errors

**Problem**: Frontend blocked by CORS

**Solution**: Update backend `.env`:

```bash
FRONTEND_URL=http://demo.localhost:3000,http://school1.localhost:3000
```

### Database Connection Failed

**Problem**: Cannot connect to PostgreSQL

**Solution**:

```bash
# Check PostgreSQL is running
psql -U schools_user -d schools_development

# Reset connection
npm run db:reset

# Docker: Check container logs
docker logs schools_db
```

---

## Production Checklists

### Before Deploying to Production

- [ ] Set `NODE_ENV=production`
- [ ] Update `DB_*` for production database
- [ ] Set strong `JWT_SECRET`
- [ ] Configure `FRONTEND_URL` for production domain
- [ ] Enable HTTPS everywhere
- [ ] Set up SSL certificates for wildcard domain
- [ ] Configure mail service for notifications
- [ ] Set up monitoring and logging
- [ ] Run security audit: `npm audit`
- [ ] Load test with multiple tenants

---

## Next Steps

1. **Deploy to AWS EC2/ECS**: See [DEPLOYMENT.md](./docs/DEPLOYMENT.md)
2. **Configure Nginx**: See [Nginx Configuration](#nginx)
3. **Set up CI/CD**: GitHub Actions / GitLab CI
4. **Monitor**: Set up DataDog / New Relic

---

## References

- [Multi-Tenant Architecture](./SAAS_REFACTOR_PROMPT.md)
- [Database Schema](./database/schema.sql)
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
