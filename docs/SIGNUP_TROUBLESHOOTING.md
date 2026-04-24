# Comprehensive Signup Troubleshooting Guide

## Current Status

- ✅ Database is connected and working
- ✅ All tables exist (users, roles, students, teachers, etc.)
- ✅ Roles are populated (admin, teacher, student, parent)
- ❌ Signup endpoint returning error

## Common Signup Failure Causes (In Order of Likelihood)

### 1. Backend Server Not Running ⚠️ MOST LIKELY

**Check:**

- Is the backend running on port 5000?
- Open browser and visit: http://localhost:5000/health
- You should see: `{"success":true,"message":"Server is running",...}`

**Fix:**

```bash
cd backend
npm run dev
# Wait for: "🚀 Server running on port 5000"
```

Wait at least 3-5 seconds for the server to fully start before trying signup.

---

### 2. Frontend API URL Wrong

**Check backend .env:**

```
FRONTEND_URL=http://localhost:3001
```

**Check frontend .env:**

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Make sure frontend is running on correct port:**

- Should be: http://localhost:3000
- NOT 3001

**Fix:**

```bash
cd frontend
npm run dev
# Should show: "ready - started server on localhost:3000"
```

---

### 3. Password Hashing Issue

The bcryptjs library might fail silently.

**Symptoms:**

- Signup appears to work but user not created
- Console shows "Password hashed successfully" but nothing after

**Fix:**
Check that bcryptjs is installed:

```bash
cd backend
npm list bcryptjs
# Should show: bcryptjs@2.4.3 (or similar)
```

If not installed:

```bash
npm install bcryptjs @types/bcryptjs
```

---

### 4. Database Field Length Issue

The email or name fields might be too long for the database columns.

**Database column limits:**

- email: VARCHAR(255) - email must be < 255 chars ✓
- first_name: VARCHAR(100) - name must be < 100 chars ✓
- last_name: VARCHAR(100) - name must be < 100 chars ✓
- password_hash: VARCHAR(255) - bcrypt hash is ~60 chars ✓

Most signup failures would show "value too long" error if this was the issue.

---

### 5. Invalid Request Data

**Check that form data matches expected format:**

Frontend sends:

```json
{
  "email": "test@example.com",
  "password": "Test@123456",
  "firstName": "Test",
  "lastName": "User",
  "roleId": "student"
}
```

**Common mistakes:**

- ❌ `first_name` instead of `firstName` (backend handles this correctly)
- ❌ role as UUID instead of name (backend handles this correctly)
- ❌ Empty password field (should error "Missing required fields")

---

## Manual Testing Without Running Full App

### Option 1: Direct Database Check

```bash
cd backend
npm run test:db
```

Expected output:

```
✅ Database connection successful
✅ Table 'users' exists
✅ Table 'roles' exists
✅ Found 4 roles:
   - admin: [uuid]
   - teacher: [uuid]
   - student: [uuid]
   - parent: [uuid]
```

If this passes, database is 100% working.

---

### Option 2: Manual SQL Test

Go to Supabase dashboard → SQL Editor and run:

```sql
-- Check roles exist
SELECT id, name FROM roles;

-- Manually insert a test user
INSERT INTO users (email, password_hash, first_name, last_name, role_id, status)
VALUES (
  'manual_test@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gBegFe',
  'Test',
  'User',
  (SELECT id FROM roles WHERE name = 'student'),
  'active'
);

-- Check if user was created
SELECT email, first_name, last_name FROM users WHERE email = 'manual_test@example.com';
```

If manual insert works, the database and roles are fine. Then the issue is in the backend signup endpoint.

---

### Option 3: Trace Backend Logs

When you attempt signup with backend running (`npm run dev`), you should see:

✅ **Success case logs:**

```
=== SIGNUP REQUEST ===
Attempting signup with: { email: 'test@example.com', firstName: 'Test', ... }
🔍 Checking if email already exists...
🔍 Looking up role by name: student
✅ Role found. ID: [uuid]
🔐 Hashing password...
✅ Password hashed successfully
💾 Creating user in database...
✅ User created successfully
🔑 Generating JWT token...
✅ Token generated
=== SIGNUP SUCCESS ===
```

❌ **Error case logs:**

```
=== SIGNUP REQUEST ===
...
❌ [specific error]
=== SIGNUP ERROR ===
Error type: DatabaseError
Error message: [specific message]
=== END ERROR ===
```

**If you see logs:**

- Error messages should be more specific than "Signup failed"
- Check what the actual error is

**If you see NO logs:**

- Backend isn't receiving the request
- Check: CORS issue, wrong port, wrong API URL

---

## Step-by-Step Debugging

### Step 1: Verify Database

```bash
cd backend
npm run test:db
```

✅ All tests should pass.

### Step 2: Start Backend

```bash
npm run dev
# Wait 3-5 seconds
# Should seee: "🚀 Server running on port 5000"
```

### Step 3: Check Backend Health

Visit: http://localhost:5000/health
Should show: `{"success":true,"message":"Server is running"}`

### Step 4: Start Frontend

```bash
cd frontend
npm run dev
# Should see: "ready - started server on http://localhost:3000"
```

### Step 5: Attempt Signup

Go to: http://localhost:3000/auth/signup

1. Fill in all fields
2. Make sure Role is set to "Student" or similar (not blank)
3. Click "Create Account"
4. Watch backend console for logs
5. Check the error message

### Step 6: Report Back With

- What error message appears?
- What does the backend console show?
- Does http://localhost:5000/health work?
- Does `npm run test:db` pass?

---

## Expected Behavior After Fix

✅ **Signup success:**

1. User enters credentials
2. Clicks "Create Account"
3. Backend logs show step-by-step progress
4. User redirected to dashboard
5. User token saved to localStorage

❌ **Common errors after fix (and what they mean):**

- "Missing required fields" - didn't fill in all fields
- "Email already registered" - try different email
- "Invalid role" - role not found in database
- "Password..." - password field issue

If you get any specific error message, it's much closer to being fixed than the generic "Please try again".

---

## Quick Checklist

```
[ ] npm run test:db passes
[ ] Backend running on port 5000
[ ] Frontend running on port 3000
[ ] Can visit http://localhost:5000/health
[ ] Backend console shows logs when signup attempted
[ ] No CORS error in frontend console
[ ] Filled all signup form fields
[ ] Selected a role (not blank)
[ ] Both passwords match
```

If all boxes checked and still failing, the backend logs will contain the actual error.
