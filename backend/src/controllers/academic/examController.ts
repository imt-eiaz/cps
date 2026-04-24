import { Request, Response } from "express";
import { query } from "../../config/database.js";
import { sendError, sendResponse } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

const ALLOWED_EXAM_TYPES = ["midterm", "final", "quiz", "practical", "other"];

export const getExamMeta = asyncHandler(
  async (_req: Request, res: Response) => {
    const [academicYearsResult, classesResult, subjectsResult, teachersResult] =
      await Promise.all([
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
          `SELECT id, subject_name, subject_code
         FROM subjects
         ORDER BY subject_name ASC`,
        ),
        query(
          `SELECT t.id, u.first_name, u.last_name, t.employee_id
         FROM teachers t
         JOIN users u ON t.user_id = u.id
         WHERE t.status = 'active'
         ORDER BY u.first_name ASC, u.last_name ASC`,
        ),
      ]);

    sendResponse(res, 200, "Exam metadata retrieved successfully", {
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
      subjects: subjectsResult.rows.map((row) => ({
        id: row.id,
        subjectName: row.subject_name,
        subjectCode: row.subject_code,
      })),
      teachers: teachersResult.rows.map((row) => ({
        id: row.id,
        teacherName: `${row.first_name} ${row.last_name}`,
        employeeId: row.employee_id,
      })),
    });
  },
);

export const createExam = asyncHandler(async (req: Request, res: Response) => {
  const {
    academicYearId,
    examName,
    examCode,
    description,
    examType,
    startDate,
    endDate,
    totalMarks,
    passingMarks,
  } = req.body;

  if (
    !academicYearId ||
    !examName ||
    !examCode ||
    !examType ||
    !startDate ||
    !endDate
  ) {
    return sendError(res, 400, "Missing required fields");
  }

  if (!ALLOWED_EXAM_TYPES.includes(examType)) {
    return sendError(res, 400, "Invalid exam type");
  }

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  if (
    Number.isNaN(startDateObj.getTime()) ||
    Number.isNaN(endDateObj.getTime())
  ) {
    return sendError(res, 400, "Invalid startDate or endDate");
  }

  if (endDateObj < startDateObj) {
    return sendError(res, 400, "endDate must be on or after startDate");
  }

  const existing = await query("SELECT id FROM exams WHERE exam_code = $1", [
    examCode,
  ]);
  if (existing.rowCount && existing.rowCount > 0) {
    return sendError(res, 409, "Exam code already exists");
  }

  const result = await query(
    `INSERT INTO exams (
      academic_year_id,
      exam_name,
      exam_code,
      description,
      exam_type,
      start_date,
      end_date,
      total_marks,
      passing_marks
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      academicYearId,
      examName,
      examCode,
      description || null,
      examType,
      startDate,
      endDate,
      totalMarks || 100,
      passingMarks || 40,
    ],
  );

  const exam = result.rows[0];
  sendResponse(res, 201, "Exam created successfully", {
    id: exam.id,
    academicYearId: exam.academic_year_id,
    examName: exam.exam_name,
    examCode: exam.exam_code,
    description: exam.description,
    examType: exam.exam_type,
    startDate: exam.start_date,
    endDate: exam.end_date,
    totalMarks: exam.total_marks,
    passingMarks: exam.passing_marks,
  });
});

export const updateExam = asyncHandler(async (req: Request, res: Response) => {
  const { examId } = req.params;
  const {
    academicYearId,
    examName,
    examCode,
    description,
    examType,
    startDate,
    endDate,
    totalMarks,
    passingMarks,
  } = req.body;

  const existingExam = await query("SELECT id FROM exams WHERE id = $1", [
    examId,
  ]);
  if (existingExam.rowCount === 0) {
    return sendError(res, 404, "Exam not found");
  }

  if (examType && !ALLOWED_EXAM_TYPES.includes(examType)) {
    return sendError(res, 400, "Invalid exam type");
  }

  if (startDate && endDate) {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (
      Number.isNaN(startDateObj.getTime()) ||
      Number.isNaN(endDateObj.getTime())
    ) {
      return sendError(res, 400, "Invalid startDate or endDate");
    }
    if (endDateObj < startDateObj) {
      return sendError(res, 400, "endDate must be on or after startDate");
    }
  }

  if (examCode) {
    const duplicate = await query(
      "SELECT id FROM exams WHERE exam_code = $1 AND id <> $2",
      [examCode, examId],
    );
    if (duplicate.rowCount && duplicate.rowCount > 0) {
      return sendError(res, 409, "Exam code already exists");
    }
  }

  const updates: Record<string, any> = {};
  if (academicYearId !== undefined) updates.academic_year_id = academicYearId;
  if (examName !== undefined) updates.exam_name = examName;
  if (examCode !== undefined) updates.exam_code = examCode;
  if (description !== undefined) updates.description = description || null;
  if (examType !== undefined) updates.exam_type = examType;
  if (startDate !== undefined) updates.start_date = startDate;
  if (endDate !== undefined) updates.end_date = endDate;
  if (totalMarks !== undefined) updates.total_marks = totalMarks;
  if (passingMarks !== undefined) updates.passing_marks = passingMarks;

  if (Object.keys(updates).length === 0) {
    return sendError(res, 400, "No fields to update");
  }

  const fields = Object.keys(updates);
  const values = fields.map((field) => updates[field]);
  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(", ");

  const result = await query(
    `UPDATE exams
     SET ${setClause}, updated_at = NOW()
     WHERE id = $${fields.length + 1}
     RETURNING *`,
    [...values, examId],
  );

  const row = result.rows[0];
  sendResponse(res, 200, "Exam updated successfully", {
    id: row.id,
    academicYearId: row.academic_year_id,
    examName: row.exam_name,
    examCode: row.exam_code,
    description: row.description,
    examType: row.exam_type,
    startDate: row.start_date,
    endDate: row.end_date,
    totalMarks: row.total_marks,
    passingMarks: row.passing_marks,
  });
});

export const deleteExam = asyncHandler(async (req: Request, res: Response) => {
  const { examId } = req.params;

  const result = await query("DELETE FROM exams WHERE id = $1", [examId]);
  if (result.rowCount === 0) {
    return sendError(res, 404, "Exam not found");
  }

  sendResponse(res, 200, "Exam deleted successfully");
});

export const getExams = asyncHandler(async (req: Request, res: Response) => {
  const { academicYearId, examType, studentId } = req.query;

  const params: any[] = [];
  const conditions: string[] = [];
  let joins = "";

  if (academicYearId) {
    params.push(academicYearId);
    conditions.push(`e.academic_year_id = $${params.length}`);
  }

  if (examType) {
    params.push(examType);
    conditions.push(`e.exam_type = $${params.length}`);
  }

  if (studentId) {
    params.push(studentId);
    joins += `
      JOIN exam_schedules es ON es.exam_id = e.id
      JOIN student_enrollments se ON se.class_id = es.class_id AND se.status = 'active'
    `;
    conditions.push(`se.student_id = $${params.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT
      e.id,
      e.exam_name,
      e.exam_code,
      e.description,
      e.exam_type,
      e.start_date,
      e.end_date,
      e.total_marks,
      e.passing_marks,
      ay.id as academic_year_id,
      ay.year_name,
      COUNT(DISTINCT es2.id) as schedules_count
    FROM exams e
    JOIN academic_years ay ON ay.id = e.academic_year_id
    LEFT JOIN exam_schedules es2 ON es2.exam_id = e.id
    ${joins}
    ${whereClause}
    GROUP BY e.id, ay.id, ay.year_name
    ORDER BY e.start_date DESC, e.exam_name ASC`,
    params,
  );

  sendResponse(
    res,
    200,
    "Exams retrieved successfully",
    result.rows.map((row) => ({
      id: row.id,
      examName: row.exam_name,
      examCode: row.exam_code,
      description: row.description,
      examType: row.exam_type,
      startDate: row.start_date,
      endDate: row.end_date,
      totalMarks: row.total_marks,
      passingMarks: row.passing_marks,
      schedulesCount: parseInt(row.schedules_count || "0", 10),
      academicYear: {
        id: row.academic_year_id,
        yearName: row.year_name,
      },
    })),
  );
});

export const createExamSchedule = asyncHandler(
  async (req: Request, res: Response) => {
    const { examId } = req.params;
    const {
      classId,
      subjectId,
      examDate,
      startTime,
      endTime,
      durationMinutes,
      location,
      invigilatorId,
    } = req.body;

    if (
      !examId ||
      !classId ||
      !subjectId ||
      !examDate ||
      !startTime ||
      !endTime
    ) {
      return sendError(res, 400, "Missing required fields");
    }

    const examExists = await query("SELECT id FROM exams WHERE id = $1", [
      examId,
    ]);
    if (examExists.rowCount === 0) {
      return sendError(res, 404, "Exam not found");
    }

    const classSubjectExists = await query(
      "SELECT id FROM class_subjects WHERE class_id = $1 AND subject_id = $2",
      [classId, subjectId],
    );

    if (classSubjectExists.rowCount === 0) {
      return sendError(
        res,
        400,
        "Selected subject is not assigned to the selected class",
      );
    }

    const result = await query(
      `INSERT INTO exam_schedules (
        exam_id,
        class_id,
        subject_id,
        exam_date,
        start_time,
        end_time,
        duration_minutes,
        location,
        invigilator_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        examId,
        classId,
        subjectId,
        examDate,
        startTime,
        endTime,
        durationMinutes || null,
        location || null,
        invigilatorId || null,
      ],
    );

    const row = result.rows[0];
    sendResponse(res, 201, "Exam schedule created successfully", {
      id: row.id,
      examId: row.exam_id,
      classId: row.class_id,
      subjectId: row.subject_id,
      examDate: row.exam_date,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: row.duration_minutes,
      location: row.location,
      invigilatorId: row.invigilator_id,
    });
  },
);

export const updateExamSchedule = asyncHandler(
  async (req: Request, res: Response) => {
    const { scheduleId } = req.params;
    const {
      classId,
      subjectId,
      examDate,
      startTime,
      endTime,
      durationMinutes,
      location,
      invigilatorId,
    } = req.body;

    const existingSchedule = await query(
      "SELECT id, class_id, subject_id FROM exam_schedules WHERE id = $1",
      [scheduleId],
    );
    if (existingSchedule.rowCount === 0) {
      return sendError(res, 404, "Exam schedule not found");
    }

    const effectiveClassId = classId || existingSchedule.rows[0].class_id;
    const effectiveSubjectId = subjectId || existingSchedule.rows[0].subject_id;
    const classSubjectExists = await query(
      "SELECT id FROM class_subjects WHERE class_id = $1 AND subject_id = $2",
      [effectiveClassId, effectiveSubjectId],
    );

    if (classSubjectExists.rowCount === 0) {
      return sendError(
        res,
        400,
        "Selected subject is not assigned to the selected class",
      );
    }

    const updates: Record<string, any> = {};
    if (classId !== undefined) updates.class_id = classId;
    if (subjectId !== undefined) updates.subject_id = subjectId;
    if (examDate !== undefined) updates.exam_date = examDate;
    if (startTime !== undefined) updates.start_time = startTime;
    if (endTime !== undefined) updates.end_time = endTime;
    if (durationMinutes !== undefined)
      updates.duration_minutes = durationMinutes;
    if (location !== undefined) updates.location = location || null;
    if (invigilatorId !== undefined)
      updates.invigilator_id = invigilatorId || null;

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, "No fields to update");
    }

    const fields = Object.keys(updates);
    const values = fields.map((field) => updates[field]);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");

    const result = await query(
      `UPDATE exam_schedules
       SET ${setClause}
       WHERE id = $${fields.length + 1}
       RETURNING *`,
      [...values, scheduleId],
    );

    const row = result.rows[0];
    sendResponse(res, 200, "Exam schedule updated successfully", {
      id: row.id,
      examId: row.exam_id,
      classId: row.class_id,
      subjectId: row.subject_id,
      examDate: row.exam_date,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: row.duration_minutes,
      location: row.location,
      invigilatorId: row.invigilator_id,
    });
  },
);

export const deleteExamSchedule = asyncHandler(
  async (req: Request, res: Response) => {
    const { scheduleId } = req.params;

    const result = await query("DELETE FROM exam_schedules WHERE id = $1", [
      scheduleId,
    ]);
    if (result.rowCount === 0) {
      return sendError(res, 404, "Exam schedule not found");
    }

    sendResponse(res, 200, "Exam schedule deleted successfully");
  },
);

export const getExamSchedules = asyncHandler(
  async (req: Request, res: Response) => {
    const { examId, classId, studentId } = req.query;

    const params: any[] = [];
    const conditions: string[] = [];
    let joins = "";

    if (studentId) {
      params.push(studentId);
      joins += `
        JOIN student_enrollments se
          ON se.class_id = es.class_id
         AND se.status = 'active'
      `;
      conditions.push(`se.student_id = $${params.length}`);
    }

    if (examId) {
      params.push(examId);
      conditions.push(`es.exam_id = $${params.length}`);
    }

    if (classId) {
      params.push(classId);
      conditions.push(`es.class_id = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await query(
      `SELECT
        es.id,
        es.exam_id,
        es.class_id,
        es.subject_id,
        es.exam_date,
        es.start_time,
        es.end_time,
        es.duration_minutes,
        es.location,
        es.invigilator_id,
        e.exam_name,
        e.exam_type,
        c.class_name,
        c.section_name,
        s.subject_name,
        s.subject_code,
        u.first_name as invigilator_first_name,
        u.last_name as invigilator_last_name
      FROM exam_schedules es
      JOIN exams e ON e.id = es.exam_id
      JOIN classes c ON c.id = es.class_id
      JOIN subjects s ON s.id = es.subject_id
      LEFT JOIN teachers t ON t.id = es.invigilator_id
      LEFT JOIN users u ON u.id = t.user_id
      ${joins}
      ${whereClause}
      ORDER BY es.exam_date ASC, es.start_time ASC`,
      params,
    );

    sendResponse(
      res,
      200,
      "Exam schedules retrieved successfully",
      result.rows.map((row) => ({
        id: row.id,
        examId: row.exam_id,
        examName: row.exam_name,
        examType: row.exam_type,
        classId: row.class_id,
        className: row.class_name,
        sectionName: row.section_name,
        subjectId: row.subject_id,
        subjectName: row.subject_name,
        subjectCode: row.subject_code,
        examDate: row.exam_date,
        startTime: row.start_time,
        endTime: row.end_time,
        durationMinutes: row.duration_minutes,
        location: row.location,
        invigilatorId: row.invigilator_id,
        invigilatorName:
          row.invigilator_first_name && row.invigilator_last_name
            ? `${row.invigilator_first_name} ${row.invigilator_last_name}`
            : null,
      })),
    );
  },
);
