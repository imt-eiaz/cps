# Supabase Setup Guide

Complete guide to set up Supabase for the School Management System.

## 📋 Prerequisites

- Supabase account (free at [supabase.com](https://supabase.com))
- PostgreSQL knowledge (basic)
- Email account for configuration

## 🚀 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New project"
3. Fill in the form:
   - **Project name**: `school-management-system`
   - **Database password**: Create a strong password
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Select "Free" tier
4. Click "Create new project"
5. Wait 2-3 minutes for the project to initialize

## 🔑 Step 2: Get Credentials

Once the project is created:

1. Go to **Settings** → **API**
2. Copy these values to your `.env` files:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon (public) key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service role key**: `SUPABASE_SERVICE_KEY` (keep secret!)

```bash
# Backend .env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc... (SERVICE ROLE KEY)

# Frontend .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 📊 Step 3: Setup Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Copy the entire content from `database/schema.sql`
4. Paste it in the SQL editor
5. Click **Run**
6. Wait for completion (should see success message)

### Verify Schema

```sql
-- Run this in SQL editor to verify tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see all these tables:

- users, roles, students, teachers, parents
- classes, subjects, class_subjects, student_enrollments
- attendance, exams, exam_schedules, marks
- timetables, fee_categories, fee_structures
- invoices, invoice_items, payments
- assignments, assignment_submissions
- announcements, notifications, messages
- audit_logs, permissions, document_uploads, report_cards

## 🔐 Step 4: Configure Authentication

### Enable Email Auth

1. Go to **Authentication** → **Providers**
2. Click **Email** and ensure it's **Enabled**
3. Go to **Settings** → **Email**
4. Keep default settings or configure custom SMTP

### Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add these redirect URLs under **Redirect URLs**:
   ```
   http://localhost:3000
   http://localhost:3000/dashboard
   http://localhost:3000/auth/callback
   https://yourdomain.com
   https://yourdomain.com/dashboard
   ```

### Setup Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize:
   - Confirmation email
   - Password reset email
   - Invite email
   - Magic link email

## 👥 Step 5: Create Test Users

### Via Supabase Dashboard

1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Enter test credentials:
   - **Email**: `admin@school.test`
   - **Password**: `TestPassword123!`
4. Repeat for other test users

OR

### Via SQL Query

```sql
-- First, enable the pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create test users in auth.users table
INSERT INTO auth.users (
    email,
    email_confirmed_at,
    password_hash,
    raw_user_meta_data
) VALUES (
    'admin@school.test',
    NOW(),
    crypt('TestPassword123!', gen_salt('bf')),
    '{"role": "admin"}'::jsonb
);

-- Then create corresponding user records
INSERT INTO public.users (email, first_name, last_name, role_id, status)
SELECT 'admin@school.test', 'Admin', 'User',
(SELECT id FROM roles WHERE name = 'admin'),
'active'
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'admin@school.test');
```

## 🔗 Step 6: Connect Backend & Frontend

### Backend Configuration

1. Update `backend/.env`:

```env
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<your-database-password>
DB_NAME=postgres
DB_SSL=true
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

2. Update `backend/src/config/database.ts` if needed:

```typescript
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});
```

### Frontend Configuration

1. Update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 🧪 Step 7: Test the Connection

### Backend Test

```bash
cd backend
npm run dev

# In another terminal, test API
curl -X GET http://localhost:5000/health
# Should return: { "success": true, "message": "Server is running" }
```

### Frontend Test

```bash
cd frontend
npm run dev

# Open browser to http://localhost:3000
# Should see login page
```

### Login Test

1. Go to http://localhost:3000
2. Click "Login"
3. Use test credentials:
   - Email: `admin@school.test`
   - Password: `TestPassword123!`
4. Should be redirected to dashboard

## 🔄 Step 8: Enable Row Level Security (RLS)

For production security, enable RLS on tables:

```sql
-- Enable RLS on users table
ALTER TABLE ONLY public.users ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own data
CREATE POLICY "Users can see own data" ON public.users
  FOR SELECT USING (auth.uid()::text = id);

-- Create policy: Authenticated users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id);

-- Enable RLS on students
ALTER TABLE ONLY public.students ENABLE ROW LEVEL SECURITY;

-- Create policy: Students can see their own data
CREATE POLICY "Students can see own data" ON public.students
  FOR SELECT USING (
    auth.uid()::text = user_id OR
    (SELECT role_id FROM public.users WHERE id = auth.uid()::text) =
    (SELECT id FROM roles WHERE name = 'admin')
  );
```

## 📈 Step 9: Monitor & Manage

### View Logs

1. Go to **Logs** → **API Requests**
2. Monitor API usage
3. Check for errors

### Database Usage

1. Go to **Database** → **Check your usage**
2. Monitor:
   - Database size
   - Connection count
   - API requests

### Backups

1. Go to **Settings** → **Backups**
2. Automatic backups are enabled by default
3. View backup history

## 🚀 Step 10: Production Deployment

### Prepare for Production

1. **Update Redirect URLs**:
   - Go to **Authentication** → **URL Configuration**
   - Add your production domain URLs

2. **Enable HTTPS**:
   - Ensure your app uses HTTPS in production

3. **Update ENV Variables**:
   - Use production values
   - Use strong JWT_SECRET
   - Set NODE_ENV=production

4. **Configure CORS**:
   - Update backend CORS settings with your domain

5. **Enable Email Provider** (if not using Supabase default):
   - Go to **Authentication** → **Email**
   - Configure SMTP or third-party provider

### Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment steps.

## 🐛 Troubleshooting

### "Cannot connect to database"

- Check database password is correct
- Ensure Supabase project is running
- Check DB_HOST is correct
- Verify firewall/network access

### "Authentication failed"

- Ensure user exists in auth.users
- Check email is confirmed
- Verify password is correct
- Check email in redirect URLs

### "Tables not found"

- Run schema.sql again
- Check tables exist in SQL editor
- Verify you copied entire schema

### "CORS errors"

- Add your domain to CORS settings in backend
- Check NEXT_PUBLIC_SUPABASE_URL format
- Ensure trailing slash is removed

## 📚 Useful Supabase Resources

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [API Documentation](https://supabase.com/docs/reference)

## ✅ Checklist

- [ ] Supabase project created
- [ ] Credentials copied to .env files
- [ ] Database schema imported via SQL editor
- [ ] Test users created
- [ ] Email authentication configured
- [ ] Redirect URLs added
- [ ] Backend connected to database
- [ ] Frontend environment variables set
- [ ] Login working with test user
- [ ] RLS policies enabled (production)
- [ ] Backups configured

---

Need help? Check Supabase community or documentation at [supabase.com](https://supabase.com)
