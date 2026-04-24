# Exam Marks & Grades Module Documentation

## 📋 Overview

The **Exam Marks & Grades Module** is a comprehensive system for managing student examination results, calculating grades and GPA, and providing detailed performance analytics. This module focuses heavily on student-facing features while also providing robust administrative capabilities.

---

## 🗄️ Database Schema

### Tables Created/Enhanced

#### 1. **exams**

Stores information about examinations.

```sql
- id (UUID, Primary Key)
- academic_year_id (UUID, Foreign Key)
- exam_name (VARCHAR 100)
- exam_code (VARCHAR 50, UNIQUE)
- description (TEXT)
- exam_type (midterm | final | quiz | practical | other)
- term (VARCHAR 50) -- e.g., "1st Term", "2nd Term"
- start_date (DATE)
- end_date (DATE)
- total_marks (INTEGER, default 100)
- passing_marks (INTEGER, default 40)
- is_published (BOOLEAN, default FALSE) -- Controls student visibility
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 2. **marks**

Stores student marks for each exam and subject.

```sql
- id (UUID, Primary Key)
- student_id (UUID, Foreign Key → students)
- exam_id (UUID, Foreign Key → exams)
- subject_id (UUID, Foreign Key → subjects)
- class_id (UUID, Foreign Key → classes)
- marks_obtained (INTEGER)
- max_marks (INTEGER, default 100)
- grace_marks (INTEGER, default 0)
- grade (VARCHAR 5) -- A+, A, B, C, D, F, ABS
- gpa (DECIMAL 3,2)
- percentage (DECIMAL 5,2)
- is_absent (BOOLEAN, default FALSE)
- remarks (TEXT)
- created_by (UUID, Foreign Key → teachers)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

UNIQUE (student_id, exam_id, subject_id)
```

#### Indexes

```sql
CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_marks_exam ON marks(exam_id);
CREATE INDEX idx_marks_class ON marks(class_id);
CREATE INDEX idx_exams_published ON exams(is_published);
CREATE INDEX idx_exams_term ON exams(term);
```

---

## ⚙️ Backend Features

### API Endpoints

#### 1. **Upload Marks in Bulk**

```http
POST /api/academic/marks/bulk
Authorization: Bearer <token>
Roles: admin, teacher

Request Body:
{
  "examId": "uuid",
  "classId": "uuid",
  "subjectId": "uuid",
  "marks": [
    {
      "studentId": "uuid",
      "marksObtained": 85,
      "isAbsent": false,
      "graceMarks": 2,
      "remarks": "Good performance"
    }
  ]
}

Response:
{
  "success": true,
  "message": "Marks uploaded successfully",
  "data": {
    "count": 10,
    "marks": [...]
  }
}
```

#### 2. **Update Student Marks**

```http
PUT /api/academic/marks/:id
Authorization: Bearer <token>
Roles: admin, teacher

Request Body:
{
  "marksObtained": 90,
  "graceMarks": 1,
  "isAbsent": false,
  "remarks": "Excellent"
}
```

#### 3. **Get Student Result by Exam**

```http
GET /api/academic/marks/student/:studentId/exam/:examId
Authorization: Bearer <token>
Roles: admin, teacher, student (own results only)

Response:
{
  "success": true,
  "message": "Student result retrieved successfully",
  "data": {
    "exam": {
      "id": "uuid",
      "name": "Mid Term Examination",
      "term": "1st Term",
      "academicYear": "2025-2026",
      "passingMarks": 40
    },
    "student": {
      "id": "uuid",
      "name": "John Smith",
      "admissionNumber": "STU001",
      "className": "Grade 10 - A"
    },
    "subjects": [
      {
        "subjectId": "uuid",
        "subjectName": "Mathematics",
        "marksObtained": 85,
        "maxMarks": 100,
        "percentage": 85.00,
        "grade": "A",
        "gpa": 3.7,
        "isAbsent": false,
        "remarks": "Excellent"
      }
    ],
    "totalObtained": 425,
    "totalMax": 500,
    "percentage": 85.00,
    "overallGrade": "A",
    "overallGPA": 3.7,
    "passed": true,
    "rank": 3
  }
}
```

#### 4. **Get All Student Results**

```http
GET /api/academic/marks/student/:studentId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Student results retrieved successfully",
  "data": [
    {
      "examId": "uuid",
      "examName": "Mid Term Examination",
      "term": "1st Term",
      "examType": "midterm",
      "academicYear": "2025-2026",
      "date": "2025-11-01",
      "isPublished": true,
      "subjectsCount": 5,
      "totalObtained": 425,
      "totalMax": 500,
      "percentage": 85.00,
      "overallGrade": "A",
      "overallGPA": 3.7,
      "absentCount": 0
    }
  ]
}
```

#### 5. **Get Class Result Sheet**

```http
GET /api/academic/marks/class/:classId/exam/:examId
Authorization: Bearer <token>
Roles: admin, teacher

Response:
{
  "success": true,
  "message": "Class result sheet retrieved successfully",
  "data": {
    "exam": {...},
    "class": {...},
    "students": [
      {
        "studentId": "uuid",
        "studentName": "John Smith",
        "admissionNumber": "STU001",
        "subjects": [...],
        "totalObtained": 425,
        "totalMax": 500,
        "percentage": 85.00,
        "overallGrade": "A",
        "overallGPA": 3.7,
        "rank": 1,
        "passed": true
      }
    ]
  }
}
```

#### 6. **Publish/Unpublish Results**

```http
PATCH /api/academic/marks/exam/:examId/publish
Authorization: Bearer <token>
Roles: admin

Request Body:
{
  "isPublished": true
}
```

### Grading Scale

| Percentage | Grade | GPA | Remark       |
| ---------- | ----- | --- | ------------ |
| 90-100     | A+    | 4.0 | Outstanding  |
| 80-89      | A     | 3.7 | Excellent    |
| 70-79      | B     | 3.3 | Very Good    |
| 60-69      | C     | 3.0 | Good         |
| 50-59      | D     | 2.0 | Satisfactory |
| 0-49       | F     | 0.0 | Fail         |

### Automatic Calculations

The system automatically calculates:

- **Percentage**: `(marks_obtained / max_marks) × 100`
- **Grade**: Based on percentage and grading scale
- **GPA**: Corresponding to the grade
- **Overall GPA**: Average of all subject GPAs
- **Overall Grade**: Based on overall GPA
- **Class Rank**: Based on total marks obtained
- **Pass/Fail Status**: Considers absent students and subject-wise passing

### Business Logic

1. **Grace Marks**:
   - Can be added to marks_obtained
   - Final marks = min(marks_obtained + grace_marks, max_marks)

2. **Absent Students**:
   - Marked with is_absent = true
   - Grade = "ABS"
   - GPA = 0, Percentage = 0

3. **Pass/Fail Determination**:
   - Must pass all subjects individually
   - If absent in any subject → Overall: Fail
   - If fail in any subject → Overall: Fail
   - Otherwise → Pass

4. **Result Publishing**:
   - Only published results are visible to students
   - Admins and teachers can view unpublished results

---

##🎨 Frontend Features

### 1. **Student Results Dashboard** (`/dashboard/results`)

**Features**:

- Overview statistics cards:
  - Total Exams Taken
  - Average Percentage
  - Average GPA
  - Passed Exams Count
- Exam history timeline
- Status indicators (Published/Pending)
- Quick access to detailed results
- Download PDF option

**Components**:

- Gradient stat cards
- Exam list with hover effects
- Pass/Fail badges
- Date formatters

### 2. **Detailed Result View** (`/dashboard/results/[studentId]/[examId]`)

**Features**:

- Overall performance summary:
  - Overall Percentage
  - Pass/Fail Status
  - Overall Grade & GPA
  - Class Rank
- Subject-wise marks table:
  - Marks obtained vs max marks
  - Percentage with progress bar
  - Grade badges
  - GPA scores
  - Remarks
- Color-coded grades
- Visual percentage indicators
- Absent subject highlighting
- Grading scale reference

**UI Elements**:

- Gradient summary cards
- Responsive table design
- Color-coded grade badges
- Progress bars
- Professional print-ready layout

### 3. **Key UI Features**

- **Responsive Design**: Works on all screen sizes
- **Color Coding**:
  - Green: A/A+ grades, Pass status
  - Blue: B grade
  - Yellow: C grade
  - Orange: D grade
  - Red: F grade, Fail status
  - Gray: Absent
- **Icons**: Lucide React icons for visual appeal
- **Animations**: Smooth loading states
- **Error Handling**: User-friendly error messages

---

## 🔐 Security

### Authorization Rules

1. **Students**:
   - Can view only their own results
   - Can only see published results
   - Cannot edit marks

2. **Teachers**:
   - Can upload and edit marks
   - Can view all results (including unpublished)
   - Can view class result sheets

3. **Admins**:
   - Full access to all features
   - Can publish/unpublish results
   - Can upload, edit, and delete marks

### JWT Middleware

All API endpoints are protected with:

```javascript
authenticateToken  // Verifies JWT
authorizeRole(roles...)  // Checks user role
```

---

## 📦 Installation & Setup

### 1. Database Migration

```bash
# Run the migration to add missing columns
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -f database/migrations/add_exam_marks_enhancements.sql
```

### 2. Seed Sample Data

```bash
# First, create students, teachers, classes
cd backend
tsx seed-sample-data.ts

# Then, seed exams and marks
tsx seed-exams-marks.ts
```

### 3. Backend Setup

The routes are automatically registered in `/api/academic/marks`.

No additional configuration needed.

### 4. Frontend Navigation

The "Results" menu item is added to the sidebar automatically.

---

## 🧪 Testing

### Sample API Calls

#### Get Student Results

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/academic/marks/student/<studentId>
```

#### Upload Marks

```bash
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "examId": "...",
    "classId": "...",
    "subjectId": "...",
    "marks": [{"studentId": "...", "marksObtained": 85}]
  }' \
  http://localhost:5000/api/academic/marks/bulk
```

### Testing Checklist

- [ ] Student can view published results only
- [ ] Student cannot view other students' results
- [ ] Grades are calculated correctly
- [ ] GPA is calculated correctly
- [ ] Class rank is accurate
- [ ] Absent students show ABS grade
- [ ] Grace marks are added correctly
- [ ] Pass/fail logic works for all scenarios
- [ ] Results can be published/unpublished

---

## 🎯 Key Features Summary

✅ **Complete CRUD** for marks management  
✅ **Automatic grade & GPA calculation**  
✅ **Bulk upload** with transaction safety  
✅ **Class rank** calculation  
✅ **Result publishing** system  
✅ **Absent student** handling  
✅ **Grace marks** support  
✅ **Subject-wise pass/fail** logic  
✅ **Student-focused UI** with beautiful design  
✅ **PDF download** capability (frontend ready)  
✅ **Performance analytics** (exam history)  
✅ **Role-based access control**  
✅ **Responsive design**  
✅ **TypeScript** throughout  
✅ **Comprehensive documentation**

---

## 📱 Screenshots & UI Flow

### Student Journey

1. **Dashboard** → Click "Results" in sidebar
2. **Results Page** → See all exam results with stats
3. **Click "View Details"** → See detailed subject-wise marks
4. **Download PDF** → Get printable result card

### Admin/Teacher Journey

1. **Upload marks via API** → Use bulk upload endpoint
2. **Edit individual marks** → Use update endpoint
3. **View class results** → Get class result sheet
4. **Publish results** → Toggle publish status

---

## 🔧 Customization

### Changing Grading Scale

Edit `/backend/src/utils/grading.ts`:

```typescript
export const GRADE_SCALE: GradeScale[] = [
  { min: 90, max: 100, grade: "A+", gpa: 4.0, remark: "Outstanding" },
  // Customize as needed
];
```

### Changing Passing Percentage

Update in exam creation or per exam:

```typescript
passingMarks: 33; // Set to 33 instead of 40
```

---

## 🐛 Troubleshooting

### Issue: Results not showing for students

**Solution**: Check if `is_published` is true for the exam.

### Issue: Incorrect GPA calculation

**Solution**: Verify grading scale in `grading.ts`.

### Issue: Student ID not found

**Solution**: Ensure student record exists and is active.

---

## 📄 License

Part of the School Management System.

---

## 👥 Support

For issues, please check:

1. Database schema is up to date
2. Sample data is seeded
3. Backend server is running
4. JWT token is valid
5. User has correct permissions

---

**Built with ❤️ for efficient school management**
