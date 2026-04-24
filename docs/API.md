# API Documentation

Complete REST API documentation for School Management System.

## 🌐 Base URL

```
http://localhost:5000/api
```

## 🔐 Authentication

All endpoints (except login/signup) require JWT token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Get Token

1. Login with credentials
2. Extract `token` from response
3. Add to all subsequent requests

## 📋 Response Format

All responses follow this format:

```json
{
  "success": true/false,
  "message": "Response message",
  "data": { /* response data */ },
  "statusCode": 200
}
```

## 🔐 Authentication Endpoints

### Sign Up

**POST** `/auth/signup`

Create a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "roleId": "student|teacher|admin|parent"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "eyJhbGc...",
    "expiresIn": 86400
  },
  "statusCode": 201
}
```

### Login

**POST** `/auth/login`

Authenticate user with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roleId": "uuid",
      "roleName": "student",
      "status": "active"
    },
    "token": "eyJhbGc...",
    "expiresIn": 86400
  },
  "statusCode": 200
}
```

### Get Current User

**GET** `/auth/me`

Get current authenticated user details.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "roleId": "uuid",
    "roleName": "student",
    "status": "active"
  },
  "statusCode": 200
}
```

### Verify Token

**POST** `/auth/verify`

Verify if JWT token is valid.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "userId": "uuid",
      "email": "user@example.com",
      "roleId": "uuid",
      "roleName": "student"
    }
  },
  "statusCode": 200
}
```

### Logout

**POST** `/auth/logout`

Logout user (client-side token removal).

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Logout successful",
  "statusCode": 200
}
```

## 👥 Student Endpoints

### Get All Students

**GET** `/academic/students`

List all students with pagination.

**Query Parameters:**

- `page` (integer, default: 1): Page number
- `limit` (integer, default: 10): Items per page

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "email": "student@example.com",
      "firstName": "Jane",
      "lastName": "Student",
      "admissionNumber": "STU001",
      "admissionDate": "2024-01-15",
      "dateOfBirth": "2006-05-20",
      "gender": "Female",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  },
  "statusCode": 200
}
```

### Get Student by ID

**GET** `/academic/students/:id`

Get detailed information about a specific student.

**Path Parameters:**

- `id` (string, required): Student UUID

**Response:**

```json
{
  "success": true,
  "message": "Student retrieved successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "email": "student@example.com",
    "firstName": "Jane",
    "lastName": "Student",
    "admissionNumber": "STU001",
    "admissionDate": "2024-01-15",
    "dateOfBirth": "2006-05-20",
    "gender": "Female",
    "fatherName": "John",
    "motherName": "Mary",
    "guardianContact": "+1234567890",
    "bloodGroup": "O+",
    "medicalConditions": "",
    "address": "123 Main St",
    "status": "active"
  },
  "statusCode": 200
}
```

### Create Student

**POST** `/academic/students`

Create a new student record.

**Headers:**

```
Authorization: Bearer <token>
Role: admin
```

**Request Body:**

```json
{
  "userId": "uuid",
  "admissionNumber": "STU002",
  "admissionDate": "2024-01-15",
  "dateOfBirth": "2006-05-20",
  "gender": "Female",
  "fatherName": "John",
  "motherName": "Mary",
  "guardianContact": "+1234567890",
  "bloodGroup": "O+",
  "medicalConditions": "",
  "address": "123 Main St"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "admission_number": "STU002",
    "admission_date": "2024-01-15",
    "status": "active"
  },
  "statusCode": 201
}
```

### Update Student

**PUT** `/academic/students/:id`

Update student information.

**Headers:**

```
Authorization: Bearer <token>
Role: admin
```

**Request Body:** (all fields optional)

```json
{
  "gender": "Female",
  "father_name": "John",
  "mother_name": "Mary",
  "guardian_contact": "+1234567890",
  "blood_group": "O+",
  "medical_conditions": "",
  "address": "123 Main St",
  "status": "active"
}
```

### Delete Student

**DELETE** `/academic/students/:id`

Delete a student record.

**Headers:**

```
Authorization: Bearer <token>
Role: admin
```

### Get Student Attendance

**GET** `/academic/students/:id/attendance`

Get attendance records for a student.

**Query Parameters:**

- `startDate` (string, optional): Filter from date (YYYY-MM-DD)
- `endDate` (string, optional): Filter to date (YYYY-MM-DD)

**Response:**

```json
{
  "success": true,
  "message": "Attendance retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "attendanceDate": "2024-02-10",
      "status": "present",
      "remarks": ""
    },
    {
      "id": "uuid",
      "attendanceDate": "2024-02-09",
      "status": "absent",
      "remarks": "Medical leave"
    }
  ],
  "statusCode": 200
}
```

### Get Student Marks

**GET** `/academic/students/:id/marks`

Get exam marks for a student.

**Response:**

```json
{
  "success": true,
  "message": "Marks retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "examName": "Midterm Exam 2024",
      "subjectName": "Mathematics",
      "obtainedMarks": 85,
      "totalMarks": 100,
      "grade": "A"
    }
  ],
  "statusCode": 200
}
```

## 📘 Subject Management Endpoints

### Get All Subjects

**GET** `/academic/subjects`

List all subjects with pagination and optional search.

**Query Parameters:**

- `page` (integer, default: 1)
- `limit` (integer, default: 10)
- `search` (string, optional): Search by subject name/code

### Create Subject

**POST** `/academic/subjects`

**Request Body:**

```json
{
  "name": "Mathematics",
  "code": "MATH101",
  "description": "Core mathematics subject",
  "isActive": true
}
```

### Update Subject

**PUT** `/academic/subjects/:id`

Update one or more subject fields.

### Get Subject Allocations

**GET** `/academic/subjects/allocations`

List class-subject-teacher allocations.

### Create Subject Allocation

**POST** `/academic/subjects/allocations`

**Request Body:**

```json
{
  "classId": "uuid",
  "subjectId": "uuid",
  "teacherId": "uuid"
}
```

### Delete Subject Allocation

**DELETE** `/academic/subjects/allocations/:id`

Remove an existing class-subject allocation.

## 🗓️ Timetable Management Endpoints

### Timetable Class Options

**GET** `/academic/timetables/meta/classes`

Returns classes and sections for timetable generation.

### Timetable Subject Options

**GET** `/academic/timetables/meta/subjects`

Returns subject list for timetable form.

### Timetable Teacher Options

**GET** `/academic/timetables/meta/teachers`

Query parameters (optional):

- `classId`
- `subjectId`

Used to filter teachers, including subject-based filtering.

### Get Class Timetable

**GET** `/academic/timetables/class/:classId`

Returns class metadata and all timetable periods.

### Save Class Timetable

**PUT** `/academic/timetables/class/:classId`

**Request Body:**

```json
{
  "periods": [
    {
      "dayOfWeek": "Monday",
      "startTime": "08:00",
      "endTime": "08:45",
      "subjectId": "uuid",
      "teacherId": "uuid",
      "roomNumber": "Room 101"
    }
  ]
}
```

### Teacher Timetable (Logged-in User)

**GET** `/academic/timetables/teacher/me`

Returns weekly timetable for authenticated teacher.

### Student Timetable (Logged-in User)

**GET** `/academic/timetables/student/me`

Returns read-only weekly timetable for authenticated student based on active enrollment.

## 👨‍💼 Admin Endpoints

### Get All Users

**GET** `/admin/users`

List all users in the system.

**Query Parameters:**

- `page` (integer, default: 1): Page number
- `limit` (integer, default: 10): Items per page
- `role` (string, optional): Filter by role (student, teacher, admin, parent)

**Headers:**

```
Authorization: Bearer <token>
Role: admin
```

### Get User by ID

**GET** `/admin/users/:id`

Get user details.

**Headers:**

```
Authorization: Bearer <token>
Role: admin
```

### Update User

**PUT** `/admin/users/:id`

Update user information.

**Request Body:** (all fields optional)

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+1234567890",
  "status": "active"
}
```

### Change User Status

**PATCH** `/admin/users/:id/status`

Change user account status.

**Request Body:**

```json
{
  "status": "active|inactive|suspended"
}
```

### Get Dashboard Statistics

**GET** `/admin/dashboard`

Get system statistics for admin dashboard.

**Response:**

```json
{
  "success": true,
  "message": "Dashboard statistics retrieved",
  "data": {
    "totalUsers": 150,
    "totalStudents": 120,
    "totalTeachers": 25,
    "totalClasses": 8,
    "usersByRole": [
      {
        "name": "student",
        "count": "120"
      },
      {
        "name": "teacher",
        "count": "25"
      },
      {
        "name": "admin",
        "count": "5"
      }
    ]
  },
  "statusCode": 200
}
```

## 🔄 Pagination Response Format

Paginated endpoints return:

```json
{
  "success": true,
  "data": [
    /* array of items */
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  },
  "statusCode": 200
}
```

## ❌ Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description",
  "statusCode": 400
}
```

## 🔧 HTTP Status Codes

- `200 OK`: Successful GET, PUT, PATCH
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate)
- `500 Internal Server Error`: Server error

## 🧪 Testing with cURL

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.test",
    "password": "TestPassword123!"
  }'
```

### Get Students (with token)

```bash
curl -X GET http://localhost:5000/api/academic/students \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Student

```bash
curl -X POST http://localhost:5000/api/academic/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "admissionNumber": "STU003",
    "admissionDate": "2024-01-15",
    "dateOfBirth": "2006-05-20",
    "gender": "Male"
  }'
```

## 🗓️ Exam Management Endpoints

Base path: `/api/academic/exams`

- `GET /meta`
  - Returns metadata for exam and schedule forms:
    - academic years
    - classes
    - subjects
    - teachers
- `GET /`
  - List exams
  - Optional query params:
    - `academicYearId`
    - `examType` (`midterm`, `final`, `quiz`, `practical`, `other`)
    - `studentId` (filters exams relevant to student schedules)
- `POST /`
  - Create exam
  - Required fields:
    - `academicYearId`, `examName`, `examCode`, `examType`, `startDate`, `endDate`
  - Optional fields:
    - `description`, `totalMarks`, `passingMarks`
- `PUT /:examId`
  - Update an existing exam
  - Any subset of exam fields can be provided
- `DELETE /:examId`
  - Delete an exam
- `GET /schedules`
  - List exam schedules
  - Optional query params:
    - `studentId`, `examId`, `classId`
- `POST /:examId/schedules`
  - Create exam schedule
  - Required fields:
    - `classId`, `subjectId`, `examDate`, `startTime`, `endTime`
  - Optional fields:
    - `durationMinutes`, `location`, `invigilatorId`
- `PUT /schedules/:scheduleId`
  - Update an existing exam schedule
  - Any subset of schedule fields can be provided
- `DELETE /schedules/:scheduleId`
  - Delete an exam schedule

## 🧾 Report Card Endpoints

Base path: `/api/academic/report-cards`

- `GET /meta`
  - Returns report-card metadata:
    - academic years
    - classes
    - exams
    - terms
- `POST /generate`
  - Generate report cards for a class (`admin`/`teacher`)
  - Required fields:
    - `academicYearId`, `termName`, `examId`, `classId`
- `GET /tabulation`
  - Get tabulation sheet (`admin`/`teacher`)
  - Required query params:
    - `examId`, `classId`
  - Optional query params:
    - `academicYearId`, `termName`
- `GET /student/:studentId`
  - Get one student report card view with:
    - school header (logo/contact)
    - student bio + photo field
    - subject-wise marks/grade/GPA
    - attendance summary
    - report-card summary + signatures block
  - Optional query params:
    - `examId`, `academicYearId`, `termName`
- `GET /student/me`
  - Student self report-card endpoint (`student` role)
  - Optional query params:
    - `examId`, `academicYearId`, `termName`

## 📝 Assignment Endpoints

Base path: `/api/academic/assignments`

- `GET /meta`
  - Returns assignment form/filter metadata:
    - classes
    - subjects
- `GET /`
  - Teacher/admin assignment list with filters
  - Optional query params:
    - `classId`, `section`, `subjectId`, `status`, `studentId`
- `POST /`
  - Create assignment (`admin`/`teacher`)
  - Required fields:
    - `title`, `subjectId`, `classId`, `dueDate`
  - Optional fields:
    - `description`, `totalMarks`, `fileUrl`, `allowResubmission`, `teacherId`
- `PUT /:assignmentId`
  - Update assignment (`admin`/`teacher`)
  - Any subset of fields can be provided
- `PATCH /:assignmentId/status`
  - Change assignment status (`admin`/`teacher`)
  - Required field:
    - `status` (`active`, `closed`, `archived`)
- `DELETE /:assignmentId`
  - Delete assignment (`admin`/`teacher`)
- `GET /student/dashboard`
  - Student assignment dashboard with status (`pending/submitted/late/graded`)
  - Student role can call without params
  - Admin/teacher can pass `studentId`
- `GET /:assignmentId`
  - Get single assignment details
  - Includes `mySubmission` for student role
- `POST /:assignmentId/submit`
  - Submit or resubmit assignment (`student` role)
  - Fields:
    - `submissionText`, `fileUrl`
- `GET /:assignmentId/grading`
  - Teacher grading panel (`admin`/`teacher`)
  - Returns enrolled students + submission details
- `PUT /submissions/:submissionId/grade`
  - Grade a submission (`admin`/`teacher`)
  - Required field:
    - `marksObtained`
  - Optional field:
    - `feedback`

## 📚 Additional Endpoints

More endpoints available for:

- Teachers
- Parents
- Classes
- Subjects
- Attendance
- Exams
- Marks
- Finance (Invoices, Payments)
- Announcements
- Notifications
- Messages

For complete list, visit Swagger docs:

```
http://localhost:5000/api-docs
```

## 🔐 Rate Limiting

Currently not enforced but recommended for production:

- 100 requests per minute per IP for public endpoints
- 1000 requests per minute per user for authenticated endpoints

## 📝 Changelog

**v1.0.0** (Feb 2026)

- Initial API release
- Authentication endpoints
- Student management
- Admin dashboard
- User management

---

For more details, see [README.md](../README.md)
