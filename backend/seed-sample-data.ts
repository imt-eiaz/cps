import { query } from "./src/config/database.js";
import { hashPassword } from "./src/utils/auth.js";
import { config } from "dotenv";

config();

const getOrCreateUser = async (input: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roleId: string;
}) => {
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role_id, status)
     VALUES ($1, $2, $3, $4, $5, 'active')
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       role_id = EXCLUDED.role_id,
       status = 'active',
       updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [
      input.email,
      input.passwordHash,
      input.firstName,
      input.lastName,
      input.roleId,
    ],
  );

  return result.rows[0].id as string;
};

const getOrCreateTeacher = async (input: {
  userId: string;
  employeeId: string;
  dateOfJoining: string;
  qualification: string;
}) => {
  const existing = await query(
    `SELECT id FROM teachers WHERE user_id = $1 OR employee_id = $2 LIMIT 1`,
    [input.userId, input.employeeId],
  );

  if ((existing.rowCount || 0) > 0) {
    const updated = await query(
      `UPDATE teachers
       SET user_id = $1,
           employee_id = $2,
           date_of_joining = $3,
           qualification = $4,
           status = 'active',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id`,
      [
        input.userId,
        input.employeeId,
        input.dateOfJoining,
        input.qualification,
        existing.rows[0].id,
      ],
    );
    return updated.rows[0].id as string;
  }

  const inserted = await query(
    `INSERT INTO teachers (user_id, employee_id, date_of_joining, status, qualification)
     VALUES ($1, $2, $3, 'active', $4)
     RETURNING id`,
    [input.userId, input.employeeId, input.dateOfJoining, input.qualification],
  );

  return inserted.rows[0].id as string;
};

const getOrCreateClass = async (input: {
  academicYearId: string;
  className: string;
  sectionName: string;
  classCode: string;
  classTeacherId: string;
  studentCapacity: number;
}) => {
  const result = await query(
    `INSERT INTO classes (
       academic_year_id,
       class_name,
       section_name,
       class_code,
       class_teacher_id,
       student_capacity
     ) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (class_code)
     DO UPDATE SET
       academic_year_id = EXCLUDED.academic_year_id,
       class_name = EXCLUDED.class_name,
       section_name = EXCLUDED.section_name,
       class_teacher_id = EXCLUDED.class_teacher_id,
       student_capacity = EXCLUDED.student_capacity,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [
      input.academicYearId,
      input.className,
      input.sectionName,
      input.classCode,
      input.classTeacherId,
      input.studentCapacity,
    ],
  );

  return result.rows[0].id as string;
};

const getOrCreateStudent = async (input: {
  userId: string;
  admissionNumber: string;
  admissionDate: string;
  dateOfBirth: string;
}) => {
  const existing = await query(
    `SELECT id FROM students WHERE user_id = $1 OR admission_number = $2 LIMIT 1`,
    [input.userId, input.admissionNumber],
  );

  if ((existing.rowCount || 0) > 0) {
    const updated = await query(
      `UPDATE students
       SET user_id = $1,
           admission_number = $2,
           admission_date = $3,
           date_of_birth = $4,
           status = 'active',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id`,
      [
        input.userId,
        input.admissionNumber,
        input.admissionDate,
        input.dateOfBirth,
        existing.rows[0].id,
      ],
    );
    return updated.rows[0].id as string;
  }

  const inserted = await query(
    `INSERT INTO students (user_id, admission_number, admission_date, date_of_birth, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id`,
    [
      input.userId,
      input.admissionNumber,
      input.admissionDate,
      input.dateOfBirth,
    ],
  );

  return inserted.rows[0].id as string;
};

const seedSampleData = async () => {
  try {
    console.log("\n=== Starting Sample Data Seeding ===\n");

    // Get role IDs
    const roles = await query("SELECT id, name FROM roles");
    const roleMap = new Map(roles.rows.map((r) => [r.name, r.id]));
    const adminRoleId = roleMap.get("admin");
    const teacherRoleId = roleMap.get("teacher");
    const studentRoleId = roleMap.get("student");

    console.log("Role IDs loaded:", {
      admin: adminRoleId,
      teacher: teacherRoleId,
      student: studentRoleId,
    });

    // Get or create academic year
    let academicYear = await query(
      "SELECT id FROM academic_years WHERE is_active = true LIMIT 1",
    );

    if (academicYear.rowCount === 0) {
      console.log("\n📅 Creating academic year...");
      const schoolResult = await query(
        "SELECT id FROM school_settings LIMIT 1",
      );
      const schoolId = schoolResult.rows[0]?.id;

      if (schoolId) {
        academicYear = await query(
          `INSERT INTO academic_years (school_id, year_name, start_date, end_date, is_active)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [schoolId, "2025-2026", "2025-09-01", "2026-06-30", true],
        );
        console.log("✅ Academic year created");
      }
    }
    const academicYearId = academicYear.rows[0].id;

    // Create teachers
    console.log("\n👨‍🏫 Creating teachers...");
    const hashedPassword = await hashPassword("password123");

    const teachers = [
      {
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@school.com",
        empId: "TCH001",
      },
      {
        firstName: "Michael",
        lastName: "Brown",
        email: "michael.brown@school.com",
        empId: "TCH002",
      },
      {
        firstName: "Emily",
        lastName: "Davis",
        email: "emily.davis@school.com",
        empId: "TCH003",
      },
    ];

    const teacherIds = [];
    for (const teacher of teachers) {
      const userId = await getOrCreateUser({
        email: teacher.email,
        passwordHash: hashedPassword,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        roleId: teacherRoleId,
      });

      const teacherId = await getOrCreateTeacher({
        userId,
        employeeId: teacher.empId,
        dateOfJoining: "2024-01-01",
        qualification: "M.Ed",
      });

      teacherIds.push(teacherId);
      console.log(
        `✅ Upserted teacher: ${teacher.firstName} ${teacher.lastName}`,
      );
    }

    // Create classes
    console.log("\n📚 Creating classes...");
    const classes = [
      { name: "Grade 1", section: "A", code: "G1A", capacity: 30 },
      { name: "Grade 2", section: "A", code: "G2A", capacity: 35 },
      { name: "Grade 3", section: "A", code: "G3A", capacity: 32 },
      { name: "Grade 4", section: "B", code: "G4B", capacity: 28 },
    ];

    const classIds = [];
    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      const classId = await getOrCreateClass({
        academicYearId,
        className: cls.name,
        sectionName: cls.section,
        classCode: cls.code,
        classTeacherId: teacherIds[i % teacherIds.length],
        studentCapacity: cls.capacity,
      });

      classIds.push(classId);
      console.log(`✅ Upserted class: ${cls.name} - Section ${cls.section}`);
    }

    // Create students
    console.log("\n👨‍🎓 Creating students...");
    const students = [
      { firstName: "John", lastName: "Smith", admNo: "STU001" },
      { firstName: "Emma", lastName: "Wilson", admNo: "STU002" },
      { firstName: "Liam", lastName: "Martinez", admNo: "STU003" },
      { firstName: "Olivia", lastName: "Anderson", admNo: "STU004" },
      { firstName: "Noah", lastName: "Taylor", admNo: "STU005" },
      { firstName: "Ava", lastName: "Thomas", admNo: "STU006" },
      { firstName: "Sophia", lastName: "Moore", admNo: "STU007" },
      { firstName: "Lucas", lastName: "Jackson", admNo: "STU008" },
      { firstName: "Mia", lastName: "White", admNo: "STU009" },
      { firstName: "Ethan", lastName: "Harris", admNo: "STU010" },
    ];

    const studentIds = [];
    for (const student of students) {
      const userId = await getOrCreateUser({
        email: student.admNo.toLowerCase() + "@student.com",
        passwordHash: hashedPassword,
        firstName: student.firstName,
        lastName: student.lastName,
        roleId: studentRoleId,
      });

      const studentId = await getOrCreateStudent({
        userId,
        admissionNumber: student.admNo,
        admissionDate: "2024-01-15",
        dateOfBirth: "2015-05-20",
      });

      studentIds.push(studentId);
      console.log(
        `✅ Upserted student: ${student.firstName} ${student.lastName}`,
      );
    }

    // Enroll students in classes
    console.log("\n📝 Enrolling students...");
    for (let i = 0; i < studentIds.length; i++) {
      const classId = classIds[i % classIds.length];
      await query(
        `INSERT INTO student_enrollments (student_id, class_id, enrollment_date, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (student_id, class_id)
         DO UPDATE SET
           enrollment_date = EXCLUDED.enrollment_date,
           status = 'active',
           updated_at = CURRENT_TIMESTAMP`,
        [studentIds[i], classId, "2025-09-01"],
      );
    }
    console.log(`✅ Enrolled ${studentIds.length} students`);

    // Create attendance records
    console.log("\n✅ Creating attendance records...");
    const today = new Date().toISOString().split("T")[0];
    const statuses = [
      "present",
      "present",
      "present",
      "present",
      "absent",
      "late",
    ];

    for (const studentId of studentIds) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      await query(
        `INSERT INTO attendance (student_id, class_id, attendance_date, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, class_id, attendance_date)
         DO UPDATE SET
           status = EXCLUDED.status,
           updated_at = CURRENT_TIMESTAMP`,
        [studentId, classIds[0], today, status],
      );
    }
    console.log(`✅ Created attendance for today`);

    // Create invoices
    console.log("\n💰 Creating invoices...");
    for (let i = 0; i < studentIds.length; i++) {
      const status = i < 3 ? "pending" : i < 7 ? "paid" : "partial";
      const totalAmount = 5000 + i * 500;
      const paidAmount =
        status === "paid"
          ? totalAmount
          : status === "partial"
            ? totalAmount * 0.5
            : 0;

      await query(
        `INSERT INTO invoices (student_id, academic_year_id, invoice_number, invoice_date, due_date, total_amount, paid_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (invoice_number)
         DO UPDATE SET
           student_id = EXCLUDED.student_id,
           academic_year_id = EXCLUDED.academic_year_id,
           invoice_date = EXCLUDED.invoice_date,
           due_date = EXCLUDED.due_date,
           total_amount = EXCLUDED.total_amount,
           paid_amount = EXCLUDED.paid_amount,
           status = EXCLUDED.status,
           updated_at = CURRENT_TIMESTAMP`,
        [
          studentIds[i],
          academicYearId,
          `INV-2025-${String(i + 1).padStart(4, "0")}`,
          "2025-09-01",
          "2025-09-30",
          totalAmount,
          paidAmount,
          status,
        ],
      );
    }
    console.log(`✅ Created ${studentIds.length} invoices`);

    console.log("\n=== Summary ===");
    const summary = await query(`
      SELECT 
        (SELECT COUNT(*) FROM students WHERE status = 'active') as students,
        (SELECT COUNT(*) FROM teachers WHERE status = 'active') as teachers,
        (SELECT COUNT(*) FROM classes) as classes,
        (SELECT COUNT(*) FROM invoices WHERE status = 'pending') as pending_invoices,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'pending') as pending_amount
    `);

    const stats = summary.rows[0];
    console.log(`✅ Students: ${stats.students}`);
    console.log(`✅ Teachers: ${stats.teachers}`);
    console.log(`✅ Classes: ${stats.classes}`);
    console.log(`✅ Pending Invoices: ${stats.pending_invoices}`);
    console.log(`✅ Pending Amount: PKR ${stats.pending_amount}`);

    console.log("\n🎉 Sample data seeding completed!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding sample data:", error);
    console.error(error);
    process.exit(1);
  }
};

seedSampleData();
