# Signup Fix - Database Setup Required

## ⚠️ Issue

The signup is failing because the database roles and schema are not properly initialized in Supabase.

## ✅ Solution

### Step 1: Setup Database Schema in Supabase

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the entire content from `database/schema.sql`
6. Paste it into the SQL editor
7. Click **Run**
8. Wait for completion

### Step 2: Verify Schema Created

Run this query in Supabase SQL Editor to verify:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

You should see tables like: users, roles, students, teachers, parents, etc.

### Step 3: Verify Roles Table

Run this query to check if roles are populated:

```sql
SELECT id, name FROM roles;
```

You should see:

- admin
- teacher
- student
- parent

### Step 4: Seed Database (if roles are empty)

If the roles table is empty, run this in the backend:

```bash
cd backend
npm run seed
```

Or manually insert roles in Supabase SQL Editor:

```sql
INSERT INTO roles (name, description) VALUES
    ('admin', 'System administrator with full access'),
    ('teacher', 'Teacher with access to class and student data'),
    ('student', 'Student with access to own academic data'),
    ('parent', 'Parent with access to child academic data');

INSERT INTO school_settings (school_name, school_code, principal_name, city, phone, email)
VALUES ('Default School', 'SCHOOL001', 'Principal Name', 'City', '123-456-7890', 'school@example.com');
```

### Step 5: Test Signup

1. Restart backend: `npm start` (in backend folder)
2. Go to http://localhost:3000/auth/signup
3. Try signing up again

## 🔍 Troubleshooting

If signup still fails:

1. **Check backend logs** - Look for error messages showing:
   - Database connection issues
   - Missing roles
   - Other SQL errors

2. **Test database connection**:

   ```bash
   cd backend
   npm run dev
   # Check console for database query logs
   ```

3. **Verify credentials** - Check `backend/.env`:
   - DB_USER, DB_PASSWORD, DB_HOST should match Supabase settings
   - Found in Supabase → Settings → Database

## 📝 Expected Error Messages After Fix

If roles existed but were lowercase:

- ✅ Will now show: "Invalid role. Available roles: admin, teacher, student, parent"
- This helps debug what roles are available

If database is connected but schema missing:

- ✅ Will now show specific fields with details instead of generic "Please try again"
