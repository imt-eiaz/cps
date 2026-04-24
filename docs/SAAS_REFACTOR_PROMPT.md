You are a senior SaaS architect and TypeScript expert.

Refactor the existing production-grade PERN stack School Management System into a multi-tenant SaaS platform WITHOUT breaking existing features.

The current system already has:

- Next.js 14 frontend
- Express.js backend
- PostgreSQL database
- Supabase authentication
- RBAC
- 20+ normalized tables
- Modular controller structure

Keep the current architecture and improve it.

---

## 🎯 MULTI-TENANT SAAS GOAL

Each school must access the system using a subdomain:

sps.ventionz.com
candle.ventionz.com

Each subdomain represents one tenant.

Tenant isolation must be enforced at database query level.

---

## 🗄️ DATABASE CHANGES

Create a new table:

tenants:

- id (uuid primary key)
- name
- slug
- subdomain
- status
- created_at

Add tenant_id (UUID, foreign key → tenants.id) to all tenant-owned tables:

users
students
teachers
parents
classes
subjects
attendance
exams
marks
invoices
payments
announcements
notifications
messages
assignments
report_cards
audit_logs
document_uploads

Do NOT duplicate tables.

All queries must be automatically scoped using tenant_id.

---

## 🔐 AUTHENTICATION CHANGES

Supabase auth remains the identity provider.

On login:

1. Resolve tenant from subdomain
2. Fetch user by:
   email + tenant_id
3. Inject tenant_id into:
   - JWT
   - request context

JWT payload must contain:

userId
tenantId
role

---

## ⚙️ BACKEND REFACTOR

Keep existing structure but introduce:

src/core/tenant/

tenant.middleware.ts:

- extract subdomain from request host
- resolve tenant from database
- attach tenant to request object

Update all services and controllers to use:

req.tenant.id

Create a BaseRepository that automatically applies tenant filtering.

---

## 📦 NEW MODULE

src/modules/tenants/

- tenant creation (Super Admin only)
- tenant onboarding
- tenant settings
- tenant subscription status

---

## 👑 SUPER ADMIN PANEL

Add a platform-level Super Admin (not tied to a tenant).

Super Admin can:

- create schools
- assign subdomains
- view all tenants
- manage subscriptions

---

## 🌐 FRONTEND CHANGES

Frontend must:

- detect subdomain automatically
- store tenant context globally
- send requests without manually passing tenant_id

Update API client to dynamically use:

https://{subdomain}.yourdomain.com/api

Keep current dashboards and roles.

---

## 🧠 RBAC UPDATE

Roles are tenant-scoped.

A user belongs to one tenant.

---

## 🧩 DEVELOPMENT COMPATIBILITY

The system must work in local development using:

school1.localhost:3000
school2.localhost:3000

Provide a tenant resolver that works for localhost.

---

## 🐳 DEVOPS & DEPLOYMENT READY

Prepare configuration for:

Nginx wildcard subdomain routing
Docker environment variables
AWS EC2 deployment
Separate environments for:

- platform admin
- tenant apps

---

## 📁 KEEP EXISTING FEATURES WORKING

Do NOT remove:

Academic module
Finance module
Attendance
Exam system
Messaging
Reports

Only make them tenant-aware.

---

## 📄 DELIVERABLES

Generate:

1. SQL migration for tenants and tenant_id columns
2. Tenant middleware
3. Refactored auth flow
4. Base repository with tenant scoping
5. Example updated controller (students)
6. Super admin tenant creation flow
7. Frontend tenant detection logic
8. Updated API client
9. Local development subdomain guide
10. Production Nginx wildcard config

The code must follow the existing coding style and TypeScript patterns in the project.

Avoid rewriting the entire project.

Perform safe incremental refactoring.
