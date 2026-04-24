# Multi-Tenant SaaS Refactoring - Complete Integration Guide

This document provides a comprehensive guide to integrating the multi-tenant architecture into your existing school management system.

---

## 📋 Quick Reference

| Component              | File/Location                                                      | Purpose                                      |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| SQL Migration          | `database/migrations/20260226_add_multi_tenancy.sql`               | Adds `tenants` table and `tenant_id` columns |
| Tenant Middleware      | `backend/src/core/tenant/tenant.middleware.ts`                     | Extracts subdomain and resolves tenant       |
| Tenant Service         | `backend/src/core/tenant/tenant.service.ts`                        | CRUD operations for tenants                  |
| Base Repository        | `backend/src/core/repository/BaseRepository.ts`                    | Automatic tenant scoping for queries         |
| Auth Controller        | `backend/src/controllers/auth/authControllerMultiTenant.ts`        | Updated login/signup with tenant context     |
| Student Controller     | `backend/src/controllers/academic/studentControllerMultiTenant.ts` | Example controller using BaseRepository      |
| Super Admin Controller | `backend/src/controllers/admin/superAdminController.ts`            | Tenant management for Super Admins           |
| Types                  | `backend/src/types/index.ts`                                       | Updated with tenant types                    |
| Frontend Context       | `frontend/src/context/TenantContext.tsx`                           | Tenant detection and state management        |
| API Client             | `frontend/src/lib/apiMultiTenant.ts`                               | Multi-tenant aware API client                |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│  (Detects subdomain: school1.ventionz.com)              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                   │
│  (Wildcard routing: *.ventionz.com → backends)          │
│  (SSL/TLS termination)                                  │
│  (Rate limiting + Caching)                              │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │Backend │  │Backend │  │Backend │
    │Server1 │  │Server2 │  │Server3 │
    │:5000   │  │:5000   │  │:5000   │
    └────┬───┘  └────┬───┘  └────┬───┘
         │           │           │
         └───────────┼───────────┘
                     ▼
        ┌────────────────────────────┐
        │  Tenant Middleware         │
        │  (Extracts subdomain)      │
        │  (Resolves tenant from DB) │
        │  (Attaches to req)         │
        └────────────┬───────────────┘
                     ▼
        ┌────────────────────────────┐
        │  Auth Middleware           │
        │  (Verifies JWT token)      │
        │  (Validates tenant_id)     │
        └────────────┬───────────────┘
                     ▼
        ┌────────────────────────────┐
        │  Route Handler             │
        │  (Controller)              │
        └────────────┬───────────────┘
                     ▼
        ┌────────────────────────────┐
        │  Repository                │
        │  (BaseRepository<T>)       │
        │  (Auto-filters by tenant)  │
        └────────────┬───────────────┘
                     ▼
        ┌────────────────────────────┐
        │  PostgreSQL Database       │
        │  (All data isolated by     │
        │   tenant_id)               │
        └────────────────────────────┘
```

---

## 🚀 Integration Steps

### Step 1: Run Database Migration

```bash
# Apply multi-tenancy migration
psql -U postgres -d schools_production \
  -f database/migrations/20260226_add_multi_tenancy.sql

# Seed initial tenants
psql -U postgres -d schools_production <<EOF
INSERT INTO tenants (name, slug, subdomain, status, subscription_tier)
VALUES
  ('Demo School', 'demo', 'demo', 'active', 'enterprise'),
  ('Sample School 1', 'school1', 'school1', 'active', 'pro'),
  ('Sample School 2', 'school2', 'school2', 'active', 'pro');
EOF
```

### Step 2: Update Backend Main App File

In `backend/src/index.ts`, add tenant middleware BEFORE routes:

```typescript
import {
  tenantMiddleware,
  validateTenantStatus,
  attachTenantToResponse,
} from "./core/tenant/tenant.middleware.js";
import superAdminRoutes from "./routes/superAdmin.js";

// ... existing middleware ...

// Tenant detection (before all routes)
app.use(tenantMiddleware);
app.use(attachTenantToResponse);

// Validate tenant status (optional)
app.use(validateTenantStatus);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", authenticateToken, studentsRoutes);
app.use("/api/teachers", authenticateToken, teachersRoutes);
// ... other routes ...

// Super Admin routes (no tenant context required)
app.use("/api/admin", superAdminRoutes);

// Error handler remains last
app.use(errorHandler);
```

### Step 3: Update Authentication Routes

Replace `backend/src/routes/auth.ts` to use the new multi-tenant controllers:

```typescript
import {
  signup,
  login,
  logout,
  getCurrentUser,
  verifyToken,
  adminLogin, // Super admin login
} from "../controllers/auth/authControllerMultiTenant.js";

const router: Router = express.Router();

router.post("/signup", signup); // Requires tenant context
router.post("/login", login); // Requires tenant context
router.post("/admin/login", adminLogin); // Super admin login
router.get("/me", authenticateToken, getCurrentUser);
router.post("/logout", logout);
router.get("/verify", authenticateToken, verifyToken);

export default router;
```

### Step 4: Update Controllers to Use BaseRepository

Example: Convert `StudentController` to use `BaseRepository`:

```typescript
// Before: backend/src/controllers/academic/studentController.ts
export const getAllStudents = asyncHandler(
  async (req: Request, res: Response) => {
    const total = await query("SELECT COUNT(*) FROM students");
    const result = await query("SELECT * FROM students LIMIT $1 OFFSET $2", [
      limit,
      offset,
    ]);
    // ... manual tenant filtering needed
  },
);

// After: Use multi-tenant version
// backend/src/controllers/academic/studentControllerMultiTenant.ts
export const getAllStudents = asyncHandler(
  async (req: TenantAuthRequest, res: Response) => {
    const repo = new StudentRepository(req.tenantId);
    const result = await repo.paginate(page, limit);
    // ✅ Tenant filtering automatic!
  },
);
```

Replace routes to use new controller:

```typescript
import * as studentController from "../controllers/academic/studentControllerMultiTenant.js";

router.get("/", authenticateToken, studentController.getAllStudents);
router.get("/:id", authenticateToken, studentController.getStudentById);
router.post(
  "/",
  authenticateToken,
  authorizeRole("admin"),
  studentController.createStudent,
);
// ... other routes
```

### Step 5: Update Frontend Context Provider

Wrap your main app with `TenantProvider`:

**frontend/src/app/layout.tsx:**

```typescript
import { TenantProvider } from "@/context/TenantContext";
import { initializeApiClient } from "@/lib/apiMultiTenant";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TenantProvider>
          {/* App will automatically detect tenant from subdomain */}
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
```

### Step 6: Update Frontend API Calls

Use the new multi-tenant API client:

```typescript
// Before
import apiClient from "@/lib/api";

// After
import apiService from "@/lib/apiMultiTenant";

export default function StudentList() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    // Automatic tenant scoping!
    apiService.students.getAll().then(setStudents);
  }, []);

  return (
    // ...
  );
}
```

### Step 7: Add Super Admin Routes

Backend already includes routes in `backend/src/routes/superAdmin.ts`, just import:

```typescript
import superAdminRoutes from "./routes/superAdmin.js";

// In main app
app.use("/api/admin", superAdminRoutes);
```

---

## 🔒 Key Security Features

### Tenant Isolation at Database Level

```typescript
// All queries include tenant_id filter
SELECT * FROM students
WHERE tenant_id = $1 AND status = 'active'

// Impossible to access another tenant's data
```

### JWT Includes Tenant Context

```typescript
const token = {
  userId: "...",
  email: "...",
  roleId: "...",
  roleName: "...",
  tenantId: "tenant-123", // ← Tenant bound to token
  isSuperAdmin: false,
};
```

### Middleware Validation

Every request is validated:

1. Subdomain resolved to tenant
2. Tenant status checked (active/inactive/suspended)
3. User belongs to tenant (via JWT)
4. All queries scoped to tenant

---

## 📊 Data Flow Examples

### Login Flow

```
1. User visits: school1.ventionz.com/login
2. Frontend detects subdomain "school1"
3. POST /api/auth/login { email, password }
4. Tenant middleware resolves "school1" → tenant_id
5. Query: SELECT * FROM users
          WHERE email = $1 AND tenant_id = $2
6. JWT created with tenantId
7. Subsequent requests use tenant context from JWT
```

### Student Query Flow

```
1. GET /api/students (with Authorization: Bearer JWT)
2. Tenant middleware extracts subdomain → tenant_id
3. Auth middleware verifies JWT includes same tenant_id
4. StudentRepository initialized with tenant_id
5. repository.findAll() executes:
   SELECT * FROM students
   WHERE tenant_id = $1
6. Only school1's students returned
```

### Super Admin Tenant Management

```
1. GET /api/admin/tenants (Super Admin JWT)
2. Auth middleware checks isSuperAdmin: true
3. Query: SELECT * FROM tenants (no tenant filter)
4. Returns all tenants across platform
5. Super admin can create, update, delete tenants
```

---

## 🎯 Remaining Controllers to Update

Apply the same pattern to other controllers:

| Controller           | File                               | Status                                   |
| -------------------- | ---------------------------------- | ---------------------------------------- |
| StudentController    | `academic/studentController.ts`    | ✅ Done (copy from Multi-Tenant version) |
| TeacherController    | `academic/teacherController.ts`    | Convert to use BaseRepository            |
| ClassController      | `academic/classController.ts`      | Convert to use BaseRepository            |
| AttendanceController | `academic/attendanceController.ts` | Convert to use BaseRepository            |
| ExamController       | `academic/examController.ts`       | Convert to use BaseRepository            |
| MarksController      | `academic/marksController.ts`      | Convert to use BaseRepository            |
| InvoiceController    | `finance/invoiceController.ts`     | Convert to use BaseRepository            |
| PaymentController    | `finance/paymentController.ts`     | Convert to use BaseRepository            |
| MessageController    | Add tenant support                 | Convert to use BaseRepository            |

**Pattern to Follow:**

```typescript
// 1. Extend BaseRepository for entity
class TeacherRepository extends BaseRepository<any> {
  constructor(tenantId: string) {
    super("teachers", tenantId);
  }

  async getByDepartment(department: string) {
    return this.findAll({ filters: { department } });
  }
}

// 2. Use in controller
export const getTeachers = asyncHandler(
  async (req: TenantAuthRequest, res: Response) => {
    const repo = new TeacherRepository(req.tenantId);
    const data = await repo.findAll();
    sendResponse(res, 200, "Success", data);
  },
);
```

---

## 🧪 Testing Multi-Tenancy

### Unit Tests

```typescript
// Test tenant isolation
describe("Student Repository", () => {
  it("should only return students from specified tenant", async () => {
    const repo = new StudentRepository("tenant-1");
    const students = await repo.findAll();

    expect(students.every((s) => s.tenant_id === "tenant-1")).toBe(true);
  });

  it("should not access data from other tenants", async () => {
    const repo = new StudentRepository("tenant-1");
    await expect(repo.findById("student-from-tenant-2")).rejects.toThrow();
  });
});
```

### Integration Tests

```bash
# Test with different subdomains
curl -H "Host: demo.localhost:3000" http://localhost:3000/api/students
curl -H "Host: school1.localhost:3000" http://localhost:3000/api/students

# Verify data isolation
# Both requests should return different students
```

---

## 🚨 Common Pitfalls to Avoid

### ❌ Direct Database Queries

```typescript
// DON'T DO THIS - No tenant filtering!
const students = await query("SELECT * FROM students");

// DO THIS - Use repository
const repo = new StudentRepository(req.tenantId);
const students = await repo.findAll();
```

### ❌ Hardcoded Tenant IDs

```typescript
// DON'T DO THIS
const students = await query(
  "SELECT * FROM students WHERE tenant_id = 'hardcoded-id'",
);

// DO THIS - Use request context
const students = await query("SELECT * FROM students WHERE tenant_id = $1", [
  req.tenantId,
]);
```

### ❌ Missing Tenant Context in New Features

```typescript
// DON'T FORGET TO ADD tenant_id!
ALTER TABLE new_feature ADD COLUMN tenant_id UUID REFERENCES tenants(id);

// Update controller to use tenant context
// Use BaseRepository or manual scoping
```

---

## 📈 Scaling Considerations

### Performance Optimizations

1. **Indexes**: Already created in migration

   ```sql
   CREATE INDEX idx_students_tenant_id ON students(tenant_id);
   CREATE INDEX idx_users_email_tenant ON users(email, tenant_id);
   ```

2. **Connection Pooling**: Configured in Docker

   ```typescript
   max: 20,
   idleTimeoutMillis: 30000,
   connectionTimeoutMillis: 2000,
   ```

3. **Caching**: Redis configured for session and query caching

4. **Load Balancing**: Nginx distributes requests across backend instances

### Multi-Region Deployment

For global scale, replicate database and use CDN:

```
US Region        EU Region       APAC Region
│                │               │
└──┬──────────────┼───────────────┼──
   │              │               │
   ├─ RDS Primary ├─ RDS Replica ├─ RDS Replica
   │              │               │
   ├─ Redis       ├─ Redis        ├─ Redis
   │              │               │
   └─ App Servers └─ App Servers  └─ App Servers
```

---

## ✅ Deployment Checklist

Before going to production:

- [ ] Database migration applied
- [ ] All controllers converted to use BaseRepository
- [ ] Frontend wrapped with TenantProvider
- [ ] Test data isolation between tenants
- [ ] SSL/TLS configured for wildcard domain
- [ ] Nginx routes all subdomains correctly
- [ ] Redis cache configured
- [ ] Database backups scheduled
- [ ] Monitoring/alerting set up
- [ ] Super admin created
- [ ] Load testing done with multiple tenants
- [ ] Security audit completed
- [ ] Disaster recovery plan documented

---

## 📚 Additional Resources

- [Local Development Setup](./MULTI_TENANT_DEVELOPMENT_SETUP.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [API Documentation](./docs/API.md)
- [Database Schema](./database/schema.sql)
- [Multi-Tenant Refactor Prompt](./SAAS_REFACTOR_PROMPT.md)

---

## 🆘 Troubleshooting

### Issue: "Tenant context required" Error

**Cause**: Tenant middleware not executed or request not from subdomain

**Solution**:

```typescript
// Verify middleware is in app BEFORE routes
app.use(tenantMiddleware); // ← Must be here
app.use("/api/students", studentsRoutes); // ← Then routes
```

### Issue: Students from all tenants visible

**Cause**: Query not filtering by tenant_id

**Solution**:

```typescript
// Use BaseRepository instead of direct queries
const repo = new StudentRepository(req.tenantId);
const students = await repo.findAll(); // ✅ Auto-filtered
```

### Issue: Cannot login

**Cause**: User/tenant mismatch

**Solution**:

```typescript
// Ensure user belongs to tenant from request
SELECT * FROM users
WHERE email = $1 AND tenant_id = $2;  // Check both!
```

---

## 🎉 Summary

You now have a production-grade multi-tenant SaaS platform!

**What you've gained:**

✅ Complete multi-tenant data isolation  
✅ Per-school admin dashboards  
✅ Platform super admin capability  
✅ Wildcard subdomain routing  
✅ Automatic tenant context propagation  
✅ Production-ready deployment config  
✅ Scalable architecture  
✅ Security best practices

**Next steps:**

1. Execute integration steps above
2. Run tests to verify tenant isolation
3. Deploy to production
4. Monitor and scale as needed

For help, refer to the comprehensive guides in the `docs/` directory.
