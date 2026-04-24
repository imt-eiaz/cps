import { Request, Response } from "express";
import { query } from "../../config/database.js";
import { sendError, sendResponse } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import {
  calculatePercentage,
  calculateOverallGPA,
  getOverallGrade,
  getRemark,
} from "../../utils/grading.js";
import { AuthRequest } from "../../middleware/auth.js";

const DEFAULT_TERMS = ["Term 1", "Term 2", "Term 3", "Final Term"];

const ensureReportCardColumns = async () => {
  await query(
    `ALTER TABLE report_cards
       ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES exams(id),
       ADD COLUMN IF NOT EXISTS attendance_percentage DECIMAL(5, 2),
       ADD COLUMN IF NOT EXISTS overall_gpa DECIMAL(4, 2),
       ADD COLUMN IF NOT EXISTS school_logo_url TEXT,
       ADD COLUMN IF NOT EXISTS student_photo_url TEXT,
       ADD COLUMN IF NOT EXISTS principal_signature_url TEXT,
       ADD COLUMN IF NOT EXISTS class_teacher_signature_url TEXT,
       ADD COLUMN IF NOT EXISTS generated_by UUID REFERENCES users(id)`,
  );
};

export const getReportCardMeta = asyncHandler(
  async (_req: Request, res: Response) => {
    const [academicYearsResult, classesResult, examsResult] = await Promise.all(
      [
        query(
          `SELECT id, year_name, is_active
         FROM academic_years
         ORDER BY is_active DESC, start_date DESC`,
        ),
        query(
          `SELECT id, class_name, section_name, class_code
         FROM classes
         ORDER BY class_name ASC, section_name ASC`,
        ),
        query(
          `SELECT e.id, e.exam_name, e.exam_type, e.start_date, e.end_date, ay.year_name
         FROM exams e
         JOIN academic_years ay ON ay.id = e.academic_year_id
         ORDER BY e.start_date DESC`,
        ),
      ],
    );

    sendResponse(res, 200, "Report card metadata retrieved successfully", {
      academicYears: academicYearsResult.rows.map((row) => ({
        id: row.id,
        yearName: row.year_name,
        isActive: row.is_active,
      })),
      classes: classesResult.rows.map((row) => ({
        id: row.id,
        className: row.class_name,
        sectionName: row.section_name,
        classCode: row.class_code,
      })),
      exams: examsResult.rows.map((row) => ({
        id: row.id,
        examName: row.exam_name,
        examType: row.exam_type,
        startDate: row.start_date,
        endDate: row.end_date,
        academicYear: row.year_name,
      })),
      terms: DEFAULT_TERMS,
    });
  },
);

export const generateReportCards = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { academicYearId, termName, examId, classId } = req.body;

    if (!academicYearId || !termName || !examId || !classId) {
      return sendError(
        res,
        400,
        "academicYearId, termName, examId and classId are required",
      );
    }

    await ensureReportCardColumns();

    const [schoolResult, examResult, classResult, academicYearResult] =
      await Promise.all([
        query(
          `SELECT school_name, logo_url, principal_name, address, phone, email
           FROM school_settings
           ORDER BY created_at ASC
           LIMIT 1`,
        ),
        query(
          `SELECT id, exam_name, exam_type
           FROM exams
           WHERE id = $1`,
          [examId],
        ),
        query(
          `SELECT c.id, c.class_name, c.section_name,
                  u.first_name as class_teacher_first_name,
                  u.last_name as class_teacher_last_name
           FROM classes c
           LEFT JOIN teachers t ON c.class_teacher_id = t.id
           LEFT JOIN users u ON t.user_id = u.id
           WHERE c.id = $1`,
          [classId],
        ),
        query(
          `SELECT id, year_name, start_date, end_date
           FROM academic_years
           WHERE id = $1`,
          [academicYearId],
        ),
      ]);

    if (examResult.rowCount === 0) {
      return sendError(res, 404, "Exam not found");
    }

    if (classResult.rowCount === 0) {
      return sendError(res, 404, "Class not found");
    }

    if (academicYearResult.rowCount === 0) {
      return sendError(res, 404, "Academic year not found");
    }

    const school = schoolResult.rows[0] || null;
    const classInfo = classResult.rows[0];
    const academicYear = academicYearResult.rows[0];

    const studentsResult = await query(
      `SELECT s.id, s.admission_number, u.first_name, u.last_name,
              u.email, NULL::text as photo_url
       FROM student_enrollments se
       JOIN students s ON s.id = se.student_id
       JOIN users u ON u.id = s.user_id
       WHERE se.class_id = $1 AND se.status = 'active'
       ORDER BY s.admission_number ASC`,
      [classId],
    );

    if (studentsResult.rowCount === 0) {
      return sendError(res, 404, "No active students found in selected class");
    }

    const generatedRows: Array<{ studentId: string; totalObtained: number }> =
      [];

    for (const student of studentsResult.rows) {
      const marksResult = await query(
        `SELECT m.marks_obtained, m.max_marks, m.gpa
         FROM marks m
         WHERE m.student_id = $1 AND m.exam_id = $2 AND m.class_id = $3`,
        [student.id, examId, classId],
      );

      const totalObtained = marksResult.rows.reduce(
        (sum, row) => sum + Number(row.marks_obtained || 0),
        0,
      );
      const totalMax = marksResult.rows.reduce(
        (sum, row) => sum + Number(row.max_marks || 0),
        0,
      );
      const percentage = calculatePercentage(totalObtained, totalMax || 1);
      const overallGPA = calculateOverallGPA(
        marksResult.rows.map((row) => Number(row.gpa || 0)),
      );
      const grade = getOverallGrade(overallGPA);
      const remarks = getRemark(percentage);

      const attendanceResult = await query(
        `SELECT
            COUNT(*) FILTER (WHERE a.status = 'present') as present_count,
            COUNT(*) FILTER (WHERE a.status = 'late') as late_count,
            COUNT(a.id) as total_days
         FROM attendance a
         WHERE a.student_id = $1
           AND a.class_id = $2
           AND a.attendance_date BETWEEN $3 AND $4`,
        [student.id, classId, academicYear.start_date, academicYear.end_date],
      );

      const attendance = attendanceResult.rows[0];
      const totalDays = Number(attendance?.total_days || 0);
      const attendedDays =
        Number(attendance?.present_count || 0) +
        Number(attendance?.late_count || 0);
      const attendancePercentage =
        totalDays > 0
          ? Number(((attendedDays / totalDays) * 100).toFixed(2))
          : 0;

      await query(
        `INSERT INTO report_cards (
          student_id,
          academic_year_id,
          class_id,
          term_name,
          total_marks,
          total_obtained_marks,
          average_percentage,
          grade,
          class_rank,
          remarks,
          generated_at,
          exam_id,
          attendance_percentage,
          overall_gpa,
          school_logo_url,
          student_photo_url,
          principal_signature_url,
          class_teacher_signature_url,
          generated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, NOW(),
          $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (student_id, academic_year_id, term_name)
        DO UPDATE SET
          class_id = EXCLUDED.class_id,
          total_marks = EXCLUDED.total_marks,
          total_obtained_marks = EXCLUDED.total_obtained_marks,
          average_percentage = EXCLUDED.average_percentage,
          grade = EXCLUDED.grade,
          remarks = EXCLUDED.remarks,
          generated_at = NOW(),
          exam_id = EXCLUDED.exam_id,
          attendance_percentage = EXCLUDED.attendance_percentage,
          overall_gpa = EXCLUDED.overall_gpa,
          school_logo_url = EXCLUDED.school_logo_url,
          student_photo_url = EXCLUDED.student_photo_url,
          principal_signature_url = EXCLUDED.principal_signature_url,
          class_teacher_signature_url = EXCLUDED.class_teacher_signature_url,
          generated_by = EXCLUDED.generated_by,
          updated_at = NOW()`,
        [
          student.id,
          academicYearId,
          classId,
          termName,
          totalMax,
          totalObtained,
          percentage,
          grade,
          remarks,
          examId,
          attendancePercentage,
          overallGPA,
          school?.logo_url || null,
          student.photo_url || null,
          null,
          null,
          req.user?.userId || null,
        ],
      );

      generatedRows.push({ studentId: student.id, totalObtained });
    }

    const ranked = [...generatedRows].sort(
      (a, b) => b.totalObtained - a.totalObtained,
    );
    for (let index = 0; index < ranked.length; index++) {
      const row = ranked[index];
      await query(
        `UPDATE report_cards
         SET class_rank = $1, updated_at = NOW()
         WHERE student_id = $2 AND academic_year_id = $3 AND term_name = $4`,
        [index + 1, row.studentId, academicYearId, termName],
      );
    }

    sendResponse(res, 201, "Report cards generated successfully", {
      generatedCount: generatedRows.length,
      class: {
        id: classInfo.id,
        className: classInfo.class_name,
        sectionName: classInfo.section_name,
      },
      exam: examResult.rows[0],
      termName,
    });
  },
);

export const getTabulationSheet = asyncHandler(
  async (req: Request, res: Response) => {
    const { academicYearId, termName, examId, classId } = req.query;

    if (!examId || !classId) {
      return sendError(res, 400, "examId and classId are required");
    }

    const [classResult, examResult, schoolResult] = await Promise.all([
      query(
        `SELECT c.id, c.class_name, c.section_name, ay.year_name
         FROM classes c
         JOIN academic_years ay ON ay.id = c.academic_year_id
         WHERE c.id = $1`,
        [classId],
      ),
      query(
        `SELECT id, exam_name, exam_type, start_date, end_date
         FROM exams
         WHERE id = $1`,
        [examId],
      ),
      query(
        `SELECT school_name, logo_url
         FROM school_settings
         ORDER BY created_at ASC
         LIMIT 1`,
      ),
    ]);

    if (classResult.rowCount === 0) {
      return sendError(res, 404, "Class not found");
    }

    if (examResult.rowCount === 0) {
      return sendError(res, 404, "Exam not found");
    }

    const marksResult = await query(
      `SELECT
          s.id as student_id,
          s.admission_number,
          u.first_name,
          u.last_name,
          sub.id as subject_id,
          sub.subject_name,
          sub.subject_code,
          m.marks_obtained,
          m.max_marks,
          m.grade,
          m.gpa,
          m.percentage,
          m.is_absent
       FROM student_enrollments se
       JOIN students s ON s.id = se.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN marks m ON m.student_id = s.id AND m.exam_id = $1 AND m.class_id = $2
       LEFT JOIN subjects sub ON sub.id = m.subject_id
       WHERE se.class_id = $2 AND se.status = 'active'
       ORDER BY s.admission_number ASC, sub.subject_name ASC`,
      [examId, classId],
    );

    const subjectMap: Record<
      string,
      { id: string; name: string; code: string }
    > = {};
    const studentMap: Record<
      string,
      {
        studentId: string;
        studentName: string;
        admissionNumber: string;
        subjects: Record<string, any>;
        totalObtained: number;
        totalMax: number;
        gpas: number[];
      }
    > = {};

    for (const row of marksResult.rows) {
      if (!studentMap[row.student_id]) {
        studentMap[row.student_id] = {
          studentId: row.student_id,
          studentName: `${row.first_name} ${row.last_name}`,
          admissionNumber: row.admission_number,
          subjects: {},
          totalObtained: 0,
          totalMax: 0,
          gpas: [],
        };
      }

      if (row.subject_id) {
        subjectMap[row.subject_id] = {
          id: row.subject_id,
          name: row.subject_name,
          code: row.subject_code,
        };

        studentMap[row.student_id].subjects[row.subject_id] = {
          marksObtained: row.marks_obtained,
          maxMarks: row.max_marks,
          grade: row.grade,
          gpa: row.gpa,
          percentage: row.percentage,
          isAbsent: row.is_absent,
        };

        studentMap[row.student_id].totalObtained += Number(
          row.marks_obtained || 0,
        );
        studentMap[row.student_id].totalMax += Number(row.max_marks || 0);
        if (row.gpa !== null && row.gpa !== undefined) {
          studentMap[row.student_id].gpas.push(Number(row.gpa));
        }
      }
    }

    const rows = Object.values(studentMap).map((item) => {
      const percentage = calculatePercentage(
        item.totalObtained,
        item.totalMax || 1,
      );
      const gpa = calculateOverallGPA(item.gpas);
      return {
        studentId: item.studentId,
        studentName: item.studentName,
        admissionNumber: item.admissionNumber,
        subjects: item.subjects,
        totalObtained: item.totalObtained,
        totalMax: item.totalMax,
        percentage,
        gpa,
        grade: getOverallGrade(gpa),
      };
    });

    rows.sort((a, b) => b.totalObtained - a.totalObtained);
    rows.forEach((row, index) => {
      (row as any).rank = index + 1;
    });

    sendResponse(res, 200, "Tabulation sheet retrieved successfully", {
      filters: {
        academicYearId: academicYearId || null,
        termName: termName || null,
        examId,
        classId,
      },
      school: {
        name: schoolResult.rows[0]?.school_name || null,
        logoUrl: schoolResult.rows[0]?.logo_url || null,
      },
      class: {
        id: classResult.rows[0].id,
        className: classResult.rows[0].class_name,
        sectionName: classResult.rows[0].section_name,
        academicYear: classResult.rows[0].year_name,
      },
      exam: examResult.rows[0],
      subjects: Object.values(subjectMap),
      rows,
      generatedAt: new Date().toISOString(),
    });
  },
);

const buildStudentReportCard = async (
  studentId: string,
  examId: string | null,
  academicYearId?: string,
  termName?: string,
) => {
  const [studentResult, schoolResult] = await Promise.all([
    query(
      `SELECT
          s.id,
          s.admission_number,
          s.admission_date,
          s.date_of_birth,
          s.gender,
          s.address,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          c.id as class_id,
          c.class_name,
          c.section_name,
          c.class_teacher_id,
          NULL::text as photo_url
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.status = 'active'
       LEFT JOIN classes c ON c.id = se.class_id
       WHERE s.id = $1`,
      [studentId],
    ),
    query(
      `SELECT school_name, logo_url, address, phone, email, principal_name
       FROM school_settings
       ORDER BY created_at ASC
       LIMIT 1`,
    ),
  ]);

  if (studentResult.rowCount === 0) {
    throw new Error("Student not found");
  }

  const student = studentResult.rows[0];

  let resolvedExamId = examId;
  if (!resolvedExamId) {
    const latestExam = await query(
      `SELECT m.exam_id
       FROM marks m
       JOIN exams e ON e.id = m.exam_id
       WHERE m.student_id = $1
       ORDER BY e.start_date DESC
       LIMIT 1`,
      [studentId],
    );
    resolvedExamId = latestExam.rows[0]?.exam_id || null;
  }

  if (!resolvedExamId) {
    return {
      school: {
        name: schoolResult.rows[0]?.school_name || null,
        logoUrl: schoolResult.rows[0]?.logo_url || null,
        address: schoolResult.rows[0]?.address || null,
        phone: schoolResult.rows[0]?.phone || null,
        email: schoolResult.rows[0]?.email || null,
      },
      student: {
        id: student.id,
        fullName: `${student.first_name} ${student.last_name}`,
        admissionNumber: student.admission_number,
        admissionDate: student.admission_date,
        dateOfBirth: student.date_of_birth,
        gender: student.gender,
        email: student.email,
        phone: student.phone,
        address: student.address,
        className: student.class_name,
        sectionName: student.section_name,
        photoUrl: student.photo_url,
      },
      exam: null,
      academicYear: null,
      termName: termName || "Term 1",
      subjects: [],
      attendance: {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        percentage: 0,
      },
      summary: {
        totalObtained: 0,
        totalMax: 0,
        percentage: 0,
        gpa: 0,
        grade: "N/A",
        remarks: "No marks available",
      },
      signatures: {
        classTeacherName: null,
        classTeacherSignatureUrl: null,
        principalName: schoolResult.rows[0]?.principal_name || null,
        principalSignatureUrl: null,
      },
    };
  }

  const examResult = await query(
    `SELECT e.id, e.exam_name, e.exam_type, e.start_date, e.end_date,
            ay.id as academic_year_id, ay.year_name, ay.start_date as ay_start, ay.end_date as ay_end
     FROM exams e
     JOIN academic_years ay ON ay.id = e.academic_year_id
     WHERE e.id = $1`,
    [resolvedExamId],
  );

  if (examResult.rowCount === 0) {
    throw new Error("Exam not found");
  }

  const exam = examResult.rows[0];
  const finalAcademicYearId = academicYearId || exam.academic_year_id;
  const finalTerm = termName || "Term 1";

  const marksResult = await query(
    `SELECT s.subject_name, s.subject_code, m.marks_obtained, m.max_marks,
            m.percentage, m.grade, m.gpa, m.is_absent, m.remarks
     FROM marks m
     JOIN subjects s ON s.id = m.subject_id
     WHERE m.student_id = $1 AND m.exam_id = $2
     ORDER BY s.subject_name ASC`,
    [studentId, resolvedExamId],
  );

  const subjects = marksResult.rows.map((row) => ({
    subjectName: row.subject_name,
    subjectCode: row.subject_code,
    marksObtained: Number(row.marks_obtained || 0),
    maxMarks: Number(row.max_marks || 0),
    percentage: Number(row.percentage || 0),
    grade: row.grade,
    gpa: Number(row.gpa || 0),
    isAbsent: row.is_absent,
    remarks: row.remarks,
  }));

  const totalObtained = subjects.reduce(
    (sum, item) => sum + item.marksObtained,
    0,
  );
  const totalMax = subjects.reduce((sum, item) => sum + item.maxMarks, 0);
  const percentage = calculatePercentage(totalObtained, totalMax || 1);
  const gpa = calculateOverallGPA(subjects.map((item) => item.gpa));
  const grade = getOverallGrade(gpa);
  const remarks = getRemark(percentage);

  const attendanceResult = await query(
    `SELECT
        COUNT(*) FILTER (WHERE status = 'present') as present_count,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
        COUNT(*) FILTER (WHERE status = 'late') as late_count,
        COUNT(*) as total_days
     FROM attendance
     WHERE student_id = $1
       AND class_id = $2
       AND attendance_date BETWEEN $3 AND $4`,
    [studentId, student.class_id, exam.ay_start, exam.ay_end],
  );

  const attendance = attendanceResult.rows[0] || {};
  const totalDays = Number(attendance.total_days || 0);
  const presentDays = Number(attendance.present_count || 0);
  const absentDays = Number(attendance.absent_count || 0);
  const lateDays = Number(attendance.late_count || 0);
  const attendancePercentage =
    totalDays > 0
      ? Number((((presentDays + lateDays) / totalDays) * 100).toFixed(2))
      : 0;

  const classTeacherResult = await query(
    `SELECT u.first_name, u.last_name
     FROM classes c
     LEFT JOIN teachers t ON t.id = c.class_teacher_id
     LEFT JOIN users u ON u.id = t.user_id
     WHERE c.id = $1`,
    [student.class_id],
  );

  await ensureReportCardColumns();
  await query(
    `INSERT INTO report_cards (
      student_id,
      academic_year_id,
      class_id,
      term_name,
      total_marks,
      total_obtained_marks,
      average_percentage,
      grade,
      remarks,
      generated_at,
      exam_id,
      attendance_percentage,
      overall_gpa,
      school_logo_url,
      student_photo_url,
      principal_signature_url,
      class_teacher_signature_url
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13, $14, $15, $16
    )
    ON CONFLICT (student_id, academic_year_id, term_name)
    DO UPDATE SET
      class_id = EXCLUDED.class_id,
      total_marks = EXCLUDED.total_marks,
      total_obtained_marks = EXCLUDED.total_obtained_marks,
      average_percentage = EXCLUDED.average_percentage,
      grade = EXCLUDED.grade,
      remarks = EXCLUDED.remarks,
      generated_at = NOW(),
      exam_id = EXCLUDED.exam_id,
      attendance_percentage = EXCLUDED.attendance_percentage,
      overall_gpa = EXCLUDED.overall_gpa,
      school_logo_url = EXCLUDED.school_logo_url,
      student_photo_url = EXCLUDED.student_photo_url,
      principal_signature_url = EXCLUDED.principal_signature_url,
      class_teacher_signature_url = EXCLUDED.class_teacher_signature_url,
      updated_at = NOW()`,
    [
      studentId,
      finalAcademicYearId,
      student.class_id,
      finalTerm,
      totalMax,
      totalObtained,
      percentage,
      grade,
      remarks,
      resolvedExamId,
      attendancePercentage,
      gpa,
      schoolResult.rows[0]?.logo_url || null,
      student.photo_url || null,
      null,
      null,
    ],
  );

  return {
    school: {
      name: schoolResult.rows[0]?.school_name || null,
      logoUrl: schoolResult.rows[0]?.logo_url || null,
      address: schoolResult.rows[0]?.address || null,
      phone: schoolResult.rows[0]?.phone || null,
      email: schoolResult.rows[0]?.email || null,
    },
    student: {
      id: student.id,
      fullName: `${student.first_name} ${student.last_name}`,
      admissionNumber: student.admission_number,
      admissionDate: student.admission_date,
      dateOfBirth: student.date_of_birth,
      gender: student.gender,
      email: student.email,
      phone: student.phone,
      address: student.address,
      className: student.class_name,
      sectionName: student.section_name,
      photoUrl: student.photo_url,
    },
    exam: {
      id: exam.id,
      examName: exam.exam_name,
      examType: exam.exam_type,
      startDate: exam.start_date,
      endDate: exam.end_date,
    },
    academicYear: {
      id: exam.academic_year_id,
      yearName: exam.year_name,
    },
    termName: finalTerm,
    subjects,
    attendance: {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      percentage: attendancePercentage,
    },
    summary: {
      totalObtained,
      totalMax,
      percentage,
      gpa,
      grade,
      remarks,
    },
    signatures: {
      classTeacherName:
        classTeacherResult.rows[0]?.first_name &&
        classTeacherResult.rows[0]?.last_name
          ? `${classTeacherResult.rows[0].first_name} ${classTeacherResult.rows[0].last_name}`
          : null,
      classTeacherSignatureUrl: null,
      principalName: schoolResult.rows[0]?.principal_name || null,
      principalSignatureUrl: null,
    },
  };
};

export const getStudentReportCard = asyncHandler(
  async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const examId = (req.query.examId as string) || null;
    const academicYearId = req.query.academicYearId as string | undefined;
    const termName = req.query.termName as string | undefined;

    try {
      const data = await buildStudentReportCard(
        studentId,
        examId,
        academicYearId,
        termName,
      );
      sendResponse(
        res,
        200,
        "Student report card retrieved successfully",
        data,
      );
    } catch (error: any) {
      if (error.message === "Student not found") {
        return sendError(res, 404, "Student not found");
      }
      if (error.message === "Exam not found") {
        return sendError(res, 404, "Exam not found");
      }
      throw error;
    }
  },
);

export const getMyReportCard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.userId) {
      return sendError(res, 401, "Not authenticated");
    }

    const studentResult = await query(
      `SELECT id FROM students WHERE user_id = $1`,
      [req.user.userId],
    );

    if (studentResult.rowCount === 0) {
      return sendError(res, 404, "Student profile not found");
    }

    const studentId = studentResult.rows[0].id;
    const examId = (req.query.examId as string) || null;
    const academicYearId = req.query.academicYearId as string | undefined;
    const termName = req.query.termName as string | undefined;

    const data = await buildStudentReportCard(
      studentId,
      examId,
      academicYearId,
      termName,
    );

    sendResponse(res, 200, "My report card retrieved successfully", data);
  },
);
