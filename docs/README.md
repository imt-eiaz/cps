# School Management System - PENN Stack

A comprehensive, production-ready School Management System built with the PENN Stack (PostgreSQL, Express.js, Next.js, Node.js) with Supabase for authentication and Tailwind CSS for styling.

## 🚀 Features

### Core Features

- **User Management**: Multi-role authentication (Admin, Teacher, Student, Parent)
- **Academic Management**: Classes, subjects, timetables, assignments
- **Attendance System**: Track student attendance with analytics
- **Exam Management**: Create exams, schedule, and manage marks
- **Finance Module**: Fee structure, invoices, payment tracking
- **Announcements**: School-wide announcements and notifications
- **Messaging**: Communication between teachers, students, and parents
- **Reports**: Generate comprehensive academic and financial reports

### Advanced Features

- Real-time notifications
- Document management
- Audit logs
- Role-based access control (RBAC)
- Mobile-responsive design
- API documentation with Swagger
- Database views for complex queries

## 🛠️ Tech Stack

### Frontend

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: State management
- **TanStack Query**: Server state management
- **Supabase Auth**: Authentication
- **Recharts**: Data visualization

### Backend

- **Node.js + Express.js**: REST API server
- **TypeScript**: Type-safe backend code
- **PostgreSQL**: Relational database
- **Supabase**: Auth and PostgreSQL hosting
- **JWT**: Secure token-based authentication
- **Swagger**: API documentation

### Database

- **PostgreSQL**: With 20+ normalized tables
- **Migrations**: SQL schema with triggers
- **Views**: Pre-defined queries for complex operations
- **Indexes**: Performance optimization

## 📁 Project Structure

```
school-management-system/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── academic/
│   │   │   └── finance/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── config/
│   │   ├── types/
│   │   ├── utils/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── dashboard/
│   │   │   ├── admin/
│   │   │   ├── teacher/
│   │   │   ├── student/
│   │   │   └── parent/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── store/
│   │   ├── types/
│   │   └── styles/
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   └── tailwind.config.ts
├── database/
│   ├── schema.sql
│   └── migrations/
├── docs/
│   ├── SETUP.md
│   ├── API.md
│   └── DEPLOYMENT.md
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn
- Supabase account (free tier available)

### 1. Clone and Setup

```bash
# Clone repository
git clone <repo-url>
cd school-management-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Setup Environment Variables

**Backend (.env)**

```bash
# Copy from backend/.env.example
cp backend/.env.example backend/.env

# Edit backend/.env and set:
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=school_management
JWT_SECRET=your-secret-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env.local)**

```bash
# Copy from frontend/.env.example
cp frontend/.env.example frontend/.env.local

# Edit frontend/.env.local and set:
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb school_management

# Run schema
psql school_management < database/schema.sql

# Or use Supabase SQL editor and paste schema.sql
```

### 4. Start Development Servers

**Backend Terminal:**

```bash
cd backend
npm run dev
# Runs on http://localhost:5000
# API Docs: http://localhost:5000/api-docs
```

**Frontend Terminal:**

```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

## 🔐 Supabase Setup

See [SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) for detailed Supabase configuration.

### Quick Setup:

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and ANON_KEY
3. Run database schema in Supabase SQL editor
4. Enable email auth in Authentication settings
5. Add your domain to authorized redirect URLs
6. Copy credentials to .env files

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify` - Verify JWT token

### Student Endpoints

- `GET /api/academic/students` - List all students
- `GET /api/academic/students/:id` - Get student details
- `POST /api/academic/students` - Create student
- `PUT /api/academic/students/:id` - Update student
- `DELETE /api/academic/students/:id` - Delete student
- `GET /api/academic/students/:id/attendance` - Get attendance
- `GET /api/academic/students/:id/marks` - Get marks

### Admin Endpoints

- `GET /api/admin/users` - List users
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user
- `PATCH /api/admin/users/:id/status` - Change user status
- `GET /api/admin/dashboard` - Dashboard statistics

Full API documentation available at `http://localhost:5000/api-docs`

## 🧪 Default Test Credentials

Create test users after setup:

- Admin: admin@school.com / password123
- Teacher: teacher@school.com / password123
- Student: student@school.com / password123
- Parent: parent@school.com / password123

## 📦 Build for Production

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm start
```

## 🐳 Docker Deployment

```bash
# Build images
docker build -t school-api ./backend
docker build -t school-web ./frontend

# Run containers
docker run -p 5000:5000 --env-file backend/.env school-api
docker run -p 3000:3000 --env-file frontend/.env.local school-web
```

## 📊 Database Schema

### Key Tables

- **users** - User accounts and profiles
- **roles** - Role definitions (admin, teacher, student, parent)
- **students** - Student information
- **teachers** - Teacher information
- **parents** - Parent information
- **classes** - Class definitions
- **subjects** - Subject definitions
- **attendance** - Attendance records
- **exams** - Exam definitions
- **marks** - Student marks/grades
- **invoices** - Fee invoices
- **payments** - Payment records
- **announcements** - School announcements
- **notifications** - User notifications
- **messages** - User messaging

See [database/schema.sql](./database/schema.sql) for complete schema.

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Helmet.js for HTTP headers
- Input validation and sanitization
- SQL injection prevention
- Rate limiting ready
- HTTPS in production
- Secure token storage
- Role-based access control

## 🚀 Performance Optimizations

- Database indexes on frequently queried columns
- Connection pooling with pg Pool
- Response compression with gzip
- Lazy loading of components
- Image optimization with Next.js
- Database query caching with TanStack Query
- Code splitting and dynamic imports

## 📱 Responsive Design

- Mobile-first approach
- Responsive grid layouts
- Adaptive navigation
- Touch-friendly UI elements
- Optimized for all screen sizes

## 📝 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch `git checkout -b feature/amazing-feature`
3. Commit changes `git commit -m 'Add amazing feature'`
4. Push to branch `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:

1. Check existing issues on GitHub
2. Review documentation in `/docs`
3. Check API documentation at `/api-docs`
4. Contact support team

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] SMS notifications
- [ ] Video conferencing integration
- [ ] Advanced analytics dashboard
- [ ] Automated reports generation
- [ ] Parent-teacher meetings scheduling
- [ ] Online library management
- [ ] LMS integration

## 🙏 Acknowledgments

Built with modern web technologies and best practices. Special thanks to:

- Supabase team
- Next.js community
- Express.js team
- PostgreSQL community

---

**Last Updated**: February 2026
**Version**: 1.0.0
