import { query } from "./src/config/database.js";
import { config } from "dotenv";

config();

const seedExamsAndMarks = async () => {
  try {
    console.log("\n=== Seeding Exams and Marks Data ===\n");

    // Get academic year
    const academicYearResult = await query(
      "SELECT id FROM academic_years WHERE is_active = true LIMIT 1",
    );

    if (academicYearResult.rowCount === 0) {
      console.error(
        "❌ No active academic year found. Please create one first.",
      );
      process.exit(1);
    }

    const academicYearId = academicYearResult.rows[0].id;
    console.log("✅ Using academic year:", academicYearId);

    // Get classes
    const classesResult = await query("SELECT id FROM classes LIMIT 1");
    if (classesResult.rowCount === 0) {
      console.error("❌ No classes found. Please create classes first.");
      process.exit(1);
    }
    const classId = classesResult.rows[0].id;

    // Get students
    const studentsResult = await query(
      "SELECT id FROM students WHERE status = 'active'",
    );
    if (studentsResult.rowCount === 0) {
      console.error(
        "❌ No active students found. Please run seed-sample-data.ts first.",
      );
      process.exit(1);
    }
    const studentIds = studentsResult.rows.map((s) => s.id);
    console.log(`✅ Found ${studentIds.length} students`);

    // Get subjects
    const subjectsResult = await query("SELECT id, subject_name FROM subjects");
    if (subjectsResult.rowCount === 0) {
      console.log("📚 Creating sample subjects...");
      const subjects = [
        "Mathematics",
        "English",
        "Science",
        "Social Studies",
        "Computer Science",
      ];

      for (const subject of subjects) {
        await query(
          "INSERT INTO subjects (subject_code, subject_name) VALUES ($1, $2)",
          [subject.substring(0, 3).toUpperCase(), subject],
        );
      }
      console.log("✅ Created subjects");
    }

    const finalSubjectsResult = await query(
      "SELECT id, subject_name FROM subjects",
    );
    const subjects = finalSubjectsResult.rows;
    console.log(`✅ Using ${subjects.length} subjects`);

    // Create exams
    console.log("\n📝 Creating exams...");
    const exams = [
      {
        name: "Mid Term Examination",
        code: "MID-2025-1",
        term: "1st Term",
        type: "midterm",
        totalMarks: 100,
        passingMarks: 40,
      },
      {
        name: "Final Examination",
        code: "FINAL-2025-1",
        term: "1st Term",
        type: "final",
        totalMarks: 100,
        passingMarks: 40,
      },
      {
        name: "Unit Test 1",
        code: "UNIT-2025-1",
        term: "1st Term",
        type: "quiz",
        totalMarks: 50,
        passingMarks: 20,
      },
    ];

    const examIds = [];
    for (const exam of exams) {
      const result = await query(
        `INSERT INTO exams (academic_year_id, exam_name, exam_code, term, exam_type, 
         start_date, end_date, total_marks, passing_marks, is_published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (exam_code) DO UPDATE SET exam_name = $2
         RETURNING id`,
        [
          academicYearId,
          exam.name,
          exam.code,
          exam.term,
          exam.type,
          "2025-11-01",
          "2025-11-15",
          exam.totalMarks,
          exam.passingMarks,
          true, // Published
        ],
      );
      examIds.push(result.rows[0].id);
      console.log(`✅ Created exam: ${exam.name}`);
    }

    // Create marks for each student, exam, and subject
    console.log("\n📊 Creating marks...");
    let marksCount = 0;

    for (const examId of examIds) {
      for (const studentId of studentIds) {
        for (const subject of subjects) {
          // Generate random marks (50-95 for variety)
          const isAbsent = Math.random() < 0.05; // 5% chance of being absent
          const marksObtained = isAbsent
            ? 0
            : Math.floor(Math.random() * 46) + 50; // 50-95
          const maxMarks = 100;
          const graceMarks =
            Math.random() < 0.1 ? Math.floor(Math.random() * 3) + 1 : 0; // 10% get grace marks

          const finalMarks = Math.min(marksObtained + graceMarks, maxMarks);
          const percentage = isAbsent
            ? 0
            : Math.round((finalMarks / maxMarks) * 100 * 100) / 100;

          // Calculate grade and GPA
          let grade, gpa;
          if (isAbsent) {
            grade = "ABS";
            gpa = 0;
          } else if (percentage >= 90) {
            grade = "A+";
            gpa = 4.0;
          } else if (percentage >= 80) {
            grade = "A";
            gpa = 3.7;
          } else if (percentage >= 70) {
            grade = "B";
            gpa = 3.3;
          } else if (percentage >= 60) {
            grade = "C";
            gpa = 3.0;
          } else if (percentage >= 50) {
            grade = "D";
            gpa = 2.0;
          } else {
            grade = "F";
            gpa = 0;
          }

          const remarks = isAbsent
            ? "Absent"
            : percentage >= 90
              ? "Outstanding"
              : percentage >= 80
                ? "Excellent"
                : percentage >= 70
                  ? "Very Good"
                  : percentage >= 60
                    ? "Good"
                    : percentage >= 50
                      ? "Satisfactory"
                      : "Needs Improvement";

          await query(
            `INSERT INTO marks (student_id, exam_id, subject_id, class_id, marks_obtained, 
             max_marks, grace_marks, grade, gpa, percentage, is_absent, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (student_id, exam_id, subject_id) 
             DO UPDATE SET marks_obtained = $5, grade = $8, gpa = $9, percentage = $10`,
            [
              studentId,
              examId,
              subject.id,
              classId,
              finalMarks,
              maxMarks,
              graceMarks,
              grade,
              gpa,
              percentage,
              isAbsent,
              remarks,
            ],
          );
          marksCount++;
        }
      }
    }

    console.log(`✅ Created ${marksCount} mark records`);

    // Summary
    console.log("\n=== Summary ===");
    const summary = await query(`
      SELECT 
        (SELECT COUNT(*) FROM exams WHERE is_published = true) as published_exams,
        (SELECT COUNT(*) FROM marks) as total_marks,
        (SELECT AVG(percentage) FROM marks WHERE is_absent = false) as avg_percentage
    `);

    const stats = summary.rows[0];
    console.log(`✅ Published Exams: ${stats.published_exams}`);
    console.log(`✅ Total Mark Records: ${stats.total_marks}`);
    console.log(
      `✅ Average Percentage: ${parseFloat(stats.avg_percentage).toFixed(2)}%`,
    );

    console.log("\n🎉 Exams and Marks seeding completed!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding exams and marks:", error);
    console.error(error);
    process.exit(1);
  }
};

seedExamsAndMarks();
