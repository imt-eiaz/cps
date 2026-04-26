import { Request, Response } from "express";
import { query } from "../../config/database.js";
import { sendResponse, sendError } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { AuthRequest } from "../../middleware/auth.js";
import {
  calculatePercentage,
  getGrade,
  getGPA,
  getRemark,
  calculateOverallGPA,
  calculateFinalMarks,
  determinePassFailStatus,
  getOverallGrade,
} from "../../utils/grading.js";
import { BulkMarkUpload, Mark } from "../../types/index.js";

/**
 * Upload marks in bulk for a class/subject/exam
 */
export const uploadMarksBulk = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { examId, classId, subjectId, marks } = req.body as BulkMarkUpload;
    const createdBy = req.user?.userId;

    // Validation
    if (!examId || !classId || !subjectId || !marks || marks.length === 0) {
      return sendError(res, 400, "Missing required fields");
    }

    // Get exam details for max marks
    const examResult = await query(
      "SELECT id, total_marks, passing_marks FROM exams WHERE id = $1",
      [examId],
    );

    if (examResult.rowCount === 0) {
      return sendError(res, 404, "Exam not found");
    }

    const exam = examResult.rows[0];
    const maxMarks = exam.total_marks;

    // Start transaction
    const client = await query("BEGIN");

    try {
      const createdMarks: Record<string, unknown>[] = [];

      for (const mark of marks) {
        const {
          studentId,
          marksObtained,
          isAbsent = false,
          graceMarks = 0,
          remarks,
        } = mark;

        // Calculate final marks with grace marks
        const finalMarks = isAbsent
          ? 0
          : calculateFinalMarks(marksObtained, graceMarks, maxMarks);

        // Calculate percentage, grade, and GPA
        const percentage = isAbsent
          ? 0
          : calculatePercentage(finalMarks, maxMarks);
        const grade = isAbsent ? "ABS" : getGrade(percentage);
        const gpa = isAbsent ? 0 : getGPA(percentage);
        const remarkText =
          remarks || (isAbsent ? "Absent" : getRemark(percentage));

        // Insert or update marks
        const result = await query(
          `INSERT INTO marks 
           (student_id, exam_id, subject_id, class_id, marks_obtained, max_marks, 
            grace_marks, grade, gpa, percentage, is_absent, remarks, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (student_id, exam_id, subject_id)
           DO UPDATE SET 
             marks_obtained = $5,
             grace_marks = $7,
             grade = $8,
             gpa = $9,
             percentage = $10,
             is_absent = $11,
             remarks = $12,
             updated_at = NOW()
           RETURNING *`,
          [
            studentId,
            examId,
            subjectId,
            classId,
            finalMarks,
            maxMarks,
            graceMarks,
            grade,
            gpa,
            percentage,
            isAbsent,
            remarkText,
            createdBy,
          ],
        );

        createdMarks.push(result.rows[0]);
      }

      await query("COMMIT");

      sendResponse(res, 201, "Marks uploaded successfully", {
        count: createdMarks.length,
        marks: createdMarks,
      });
    } catch (error) {
      await query("ROLLBACK");
      throw error;
    }
  },
);

/**
 * Update individual student marks
 */
export const updateStudentMarks = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { marksObtained, graceMarks, isAbsent, remarks } = req.body;

    // Get existing mark
    const existing = await query("SELECT * FROM marks WHERE id = $1", [id]);

    if (existing.rowCount === 0) {
      return sendError(res, 404, "Mark record not found");
    }

    const mark = existing.rows[0];
    const maxMarks = mark.max_marks;

    // Calculate new values
    const finalMarks = isAbsent
      ? 0
      : calculateFinalMarks(
          marksObtained ?? mark.marks_obtained,
          graceMarks ?? mark.grace_marks,
          maxMarks,
        );

    const percentage = isAbsent ? 0 : calculatePercentage(finalMarks, maxMarks);
    const grade = isAbsent ? "ABS" : getGrade(percentage);
    const gpa = isAbsent ? 0 : getGPA(percentage);
    const remarkText = remarks ?? (isAbsent ? "Absent" : getRemark(percentage));

    // Update
    const result = await query(
      `UPDATE marks 
       SET marks_obtained = $1, grace_marks = $2, grade = $3, gpa = $4, 
           percentage = $5, is_absent = $6, remarks = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        finalMarks,
        graceMarks ?? mark.grace_marks,
        grade,
        gpa,
        percentage,
        isAbsent ?? mark.is_absent,
        remarkText,
        id,
      ],
    );

    sendResponse(res, 200, "Marks updated successfully", result.rows[0]);
  },
);

/**
 * Get student result for a specific exam
 */
export const getStudentResultByExam = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { studentId, examId } = req.params;

    // Authorization: Students can only view their own results
    if (req.user?.roleName === "student") {
      const myStudentResult = await query(
        "SELECT id FROM students WHERE user_id = $1",
        [req.user.userId],
      );

      if (myStudentResult.rowCount === 0) {
        return sendError(res, 404, "Student profile not found");
      }

      if (myStudentResult.rows[0].id !== studentId) {
        return sendError(res, 403, "Access denied");
      }
    }

    // Get exam details
    const examResult = await query(
      `SELECT e.*, ay.year_name 
       FROM exams e
       JOIN academic_years ay ON e.academic_year_id = ay.id
       WHERE e.id = $1`,
      [examId],
    );

    if (examResult.rowCount === 0) {
      return sendError(res, 404, "Exam not found");
    }

    const exam = examResult.rows[0];

    // Check if results are published (students can only see published results)
    if (req.user?.roleName === "student" && !exam.is_published) {
      return sendError(res, 403, "Results not yet published");
    }

    // Get student details
    const studentResult = await query(
      `SELECT s.id, u.first_name, u.last_name, s.admission_number,
              c.id as class_id, c.class_name, c.section_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN student_enrollments se ON s.id = se.student_id AND se.status = 'active'
       LEFT JOIN classes c ON se.class_id = c.id
       WHERE s.id = $1`,
      [studentId],
    );

    if (studentResult.rowCount === 0) {
      return sendError(res, 404, "Student not found");
    }

    const student = studentResult.rows[0];

    // Get marks for all subjects
    const marksResult = await query(
      `SELECT m.*, s.subject_name
       FROM marks m
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.student_id = $1 AND m.exam_id = $2
       ORDER BY s.subject_name`,
      [studentId, examId],
    );

    const subjects = marksResult.rows.map((row) => ({
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      marksObtained: row.marks_obtained,
      maxMarks: row.max_marks,
      percentage: row.percentage,
      grade: row.grade,
      gpa: row.gpa,
      isAbsent: row.is_absent,
      remarks: row.remarks,
    }));

    // Calculate overall statistics
    const totalObtained = subjects.reduce(
      (sum, s) => sum + (s.isAbsent ? 0 : s.marksObtained),
      0,
    );
    const totalMax = subjects.reduce((sum, s) => sum + s.maxMarks, 0);
    const overallPercentage = calculatePercentage(totalObtained, totalMax);
    const gpas = subjects.filter((s) => !s.isAbsent).map((s) => s.gpa);
    const overallGPA = calculateOverallGPA(gpas);
    const overallGrade = getOverallGrade(overallGPA);

    // Determine pass/fail status
    const { passed, reason } = determinePassFailStatus(
      subjects.map((s) => ({
        subject: s.subjectName,
        percentage: s.percentage,
        isAbsent: s.isAbsent,
      })),
      exam.passing_marks,
    );

    // Get class rank
    const rankResult = await query(
      `WITH student_totals AS (
        SELECT m.student_id, SUM(m.marks_obtained) as total
        FROM marks m
        WHERE m.exam_id = $1 AND m.class_id = $2
        GROUP BY m.student_id
      )
      SELECT COUNT(*) + 1 as rank
      FROM student_totals
      WHERE total > (SELECT total FROM student_totals WHERE student_id = $3)`,
      [examId, student.class_id, studentId],
    );

    const rank = rankResult.rows[0]?.rank || 1;

    sendResponse(res, 200, "Student result retrieved successfully", {
      exam: {
        id: exam.id,
        name: exam.exam_name,
        term: exam.term,
        academicYear: exam.year_name,
        passingMarks: exam.passing_marks,
      },
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        admissionNumber: student.admission_number,
        className: student.section_name
          ? `${student.class_name} - ${student.section_name}`
          : student.class_name,
      },
      subjects,
      totalObtained,
      totalMax,
      percentage: overallPercentage,
      overallGrade,
      overallGPA,
      passed,
      passFailReason: reason,
      rank,
    });
  },
);

/**
 * Get all results for a student (across all exams)
 */
export const getStudentAllResults = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { studentId } = req.params;

    // Authorization
    if (req.user?.roleName === "student") {
      const myStudentResult = await query(
        "SELECT id FROM students WHERE user_id = $1",
        [req.user.userId],
      );

      if (myStudentResult.rowCount === 0) {
        return sendError(res, 404, "Student profile not found");
      }

      if (myStudentResult.rows[0].id !== studentId) {
        return sendError(res, 403, "Access denied");
      }
    }

    // Get all exams with marks for this student
    const resultsQuery = `
      SELECT DISTINCT 
        e.id as exam_id, e.exam_name, e.term, e.exam_type, 
        e.start_date, e.is_published, ay.year_name,
        COUNT(m.id) as subjects_count
      FROM exams e
      JOIN academic_years ay ON e.academic_year_id = ay.id
      LEFT JOIN marks m ON e.id = m.exam_id AND m.student_id = $1
      WHERE m.id IS NOT NULL
        ${req.user?.roleName === "student" ? "AND e.is_published = true" : ""}
      GROUP BY e.id, e.exam_name, e.term, e.exam_type, e.start_date, e.is_published, ay.year_name
      ORDER BY e.start_date DESC
    `;

    const examsResult = await query(resultsQuery, [studentId]);

    const results: Record<string, unknown>[] = [];

    for (const exam of examsResult.rows) {
      // Get marks summary for each exam
      const marksResult = await query(
        `SELECT 
          SUM(marks_obtained) as total_obtained,
          SUM(max_marks) as total_max,
          AVG(gpa) as avg_gpa,
          COUNT(CASE WHEN is_absent = true THEN 1 END) as absent_count
         FROM marks
         WHERE student_id = $1 AND exam_id = $2`,
        [studentId, exam.exam_id],
      );

      const stats = marksResult.rows[0];
      const percentage = calculatePercentage(
        stats.total_obtained || 0,
        stats.total_max || 1,
      );
      const overallGrade = getOverallGrade(stats.avg_gpa || 0);

      results.push({
        examId: exam.exam_id,
        examName: exam.exam_name,
        term: exam.term,
        examType: exam.exam_type,
        academicYear: exam.year_name,
        date: exam.start_date,
        isPublished: exam.is_published,
        subjectsCount: exam.subjects_count,
        totalObtained: stats.total_obtained || 0,
        totalMax: stats.total_max || 0,
        percentage,
        overallGrade,
        overallGPA: parseFloat(stats.avg_gpa) || 0,
        absentCount: stats.absent_count || 0,
      });
    }

    sendResponse(res, 200, "Student results retrieved successfully", results);
  },
);

/**
 * Get class result sheet for an exam
 */
export const getClassResultSheet = asyncHandler(
  async (req: Request, res: Response) => {
    const { classId, examId } = req.params;

    // Get exam details
    const examResult = await query("SELECT * FROM exams WHERE id = $1", [
      examId,
    ]);

    if (examResult.rowCount === 0) {
      return sendError(res, 404, "Exam not found");
    }

    const exam = examResult.rows[0];

    // Get class details
    const classResult = await query("SELECT * FROM classes WHERE id = $1", [
      classId,
    ]);

    if (classResult.rowCount === 0) {
      return sendError(res, 404, "Class not found");
    }

    const classInfo = classResult.rows[0];

    // Get all students in class with their marks
    const studentsQuery = `
      SELECT DISTINCT
        s.id as student_id,
        u.first_name,
        u.last_name,
        s.admission_number
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN student_enrollments se ON s.id = se.student_id
      WHERE se.class_id = $1 AND se.status = 'active'
      ORDER BY s.admission_number
    `;

    const studentsResult = await query(studentsQuery, [classId]);

    const students: { studentId: any; studentName: string; admissionNumber: any; subjects: any[]; totalObtained: number; totalMax: number; percentage: number; overallGrade: string; overallGPA: number; passed: boolean; rank: number }[] = [];

    for (const student of studentsResult.rows) {
      // Get marks for each student
      const marksResult = await query(
        `SELECT m.*, s.subject_name
         FROM marks m
         JOIN subjects s ON m.subject_id = s.id
         WHERE m.student_id = $1 AND m.exam_id = $2
         ORDER BY s.subject_name`,
        [student.student_id, examId],
      );

      const subjects = marksResult.rows.map((row) => ({
        subjectId: row.subject_id,
        subjectName: row.subject_name,
        marksObtained: row.marks_obtained,
        maxMarks: row.max_marks,
        percentage: row.percentage,
        grade: row.grade,
        gpa: row.gpa,
        isAbsent: row.is_absent,
        remarks: row.remarks,
      }));

      const totalObtained = subjects.reduce(
        (sum, s) => sum + s.marksObtained,
        0,
      );
      const totalMax = subjects.reduce((sum, s) => sum + s.maxMarks, 0);
      const percentage = calculatePercentage(totalObtained, totalMax);
      const gpas = subjects.filter((s) => !s.isAbsent).map((s) => s.gpa);
      const overallGPA = calculateOverallGPA(gpas);
      const overallGrade = getOverallGrade(overallGPA);

      const { passed } = determinePassFailStatus(
        subjects.map((s) => ({
          subject: s.subjectName,
          percentage: s.percentage,
          isAbsent: s.isAbsent,
        })),
        exam.passing_marks,
      );

      students.push({
        studentId: student.student_id,
        studentName: `${student.first_name} ${student.last_name}`,
        admissionNumber: student.admission_number,
        subjects,
        totalObtained,
        totalMax,
        percentage,
        overallGrade,
        overallGPA,
        passed,
        rank: 0,
      });
    }

    // Calculate ranks
    students.sort((a, b) => b.totalObtained - a.totalObtained);
    students.forEach((student, index) => {
      student.rank = index + 1;
    });

    sendResponse(res, 200, "Class result sheet retrieved successfully", {
      exam: {
        id: exam.id,
        name: exam.exam_name,
        term: exam.term,
        passingMarks: exam.passing_marks,
      },
      class: {
        id: classInfo.id,
        name: `${classInfo.class_name} - ${classInfo.section_name}`,
      },
      students,
    });
  },
);

/**
 * Publish/Unpublish exam results
 */
export const toggleExamPublishStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { examId } = req.params;
    const { isPublished } = req.body;

    const result = await query(
      "UPDATE exams SET is_published = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [isPublished, examId],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Exam not found");
    }

    sendResponse(
      res,
      200,
      `Results ${isPublished ? "published" : "unpublished"} successfully`,
      result.rows[0],
    );
  },
);
