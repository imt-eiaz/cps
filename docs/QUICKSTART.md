# Quick Start Guide

Get up and running with School Management System in 5 minutes.

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL 12+ or Supabase account
- npm or yarn
- Git

## 🚀 Quick Start Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd school-management-system
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in another terminal)
cd frontend
npm install
```

### 3. Setup Environment Files

**Backend** - Copy and configure `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
# Edit with your database credentials
```

**Frontend** - Copy and configure `frontend/.env.example`:

```bash
cp frontend/.env.example frontend/.env.local
# Edit with your Supabase credentials
```

### 4. Setup Database

If using local PostgreSQL:

```bash
createdb school_management
psql school_management < database/schema.sql
```

If using Supabase:

1. Create project at [supabase.com](https://supabase.com)
2. Copy SQL from `database/schema.sql`
3. Paste in Supabase SQL editor
4. Copy credentials to .env files

### 5. Start Development Servers

**Backend** (Terminal 1):

```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Frontend** (Terminal 2):

```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### 6. Test the Application

1. Open http://localhost:3000
2. Click "Sign Up"
3. Create an account with:
   - Email: `test@example.com`
   - Password: `Test123!Password`
   - Role: `Student`
4. Login and explore dashboard

## 📚 Next Steps

- Read [README.md](./README.md) for detailed documentation
- Check [API Documentation](./docs/API.md) for API endpoints
- See [Supabase Setup](./docs/SUPABASE_SETUP.md) for authentication
- Review [Deployment Guide](./docs/DEPLOYMENT.md) for production

## 🎯 Main Endpoints

| Endpoint                 | Method | Purpose        |
| ------------------------ | ------ | -------------- |
| `/api/auth/signup`       | POST   | Create account |
| `/api/auth/login`        | POST   | Login user     |
| `/api/auth/me`           | GET    | Get user info  |
| `/api/academic/students` | GET    | List students  |
| `/api/admin/dashboard`   | GET    | Admin stats    |
| `/health`                | GET    | Health check   |

## 🐛 Common Issues

### Port Already in Use

```bash
# Find and kill process on port 5000
lsof -i :5000
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

### Database Connection Error

```bash
# Check PostgreSQL is running
psql --version
psql -U postgres

# Verify .env credentials
cat backend/.env
```

### Cannot Connect to Backend

```bash
# Check server is running
curl http://localhost:5000/health

# Check logs
pm2 logs (if using PM2)
```

## 📖 Documentation

- **[Full README](./README.md)** - Complete project documentation
- **[API Docs](./docs/API.md)** - REST API reference
- **[Supabase Setup](./docs/SUPABASE_SETUP.md)** - Authentication setup
- **[Deployment](./docs/DEPLOYMENT.md)** - Production deployment

## 💡 Tips

- Use Swagger UI at `http://localhost:5000/api-docs` to test APIs
- Database schema in `database/schema.sql` has 20+ tables
- All credentials are in .env files (never commit these)
- Use PM2 for production: `npm install -g pm2 && pm2 start npm -- start`

## 🆘 Need Help?

1. Check the FAQs in documentation
2. Review API documentation
3. Check GitHub issues
4. Email support team

---

**Happy coding! 🎉**

For more info, see [README.md](./README.md)
