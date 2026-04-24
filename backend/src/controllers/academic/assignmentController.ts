import { Request, Response } from "express";
import { query } from "../../config/database.js";
import { sendError, sendResponse } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { AuthRequest } from "../../middleware/auth.js";

const ensureAssignmentColumns = async () => {
  await query(
    `ALTER TABLE assignments
       ADD COLUMN IF NOT EXISTS allow_resubmission BOOLEAN DEFAULT FALSE`,
  );

  await query(
    `ALTER TABLE assignments
       ALTER COLUMN file_url TYPE TEXT`,
  );

  await query(
    `ALTER TABLE assignment_submissions
       ADD COLUMN IF NOT EXISTS submission_text TEXT,
       ADD COLUMN IF NOT EXISTS resubmission_count INTEGER DEFAULT 0,
       ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP`,
  );

  await query(
    `ALTER TABLE assignment_submissions
       ALTER COLUMN file_url TYPE TEXT`,
  );
};

const getTeacherIdByUser = async (userId: string) => {
  const teacherResult = await query(
    `SELECT id FROM teachers WHERE user_id = $1`,
    [userId],
  );
  return teacherResult.rows[0]?.id || null;
};

const getStudentIdByUser = async (userId: string) => {
  const studentResult = await query(
    `SELECT id FROM students WHERE user_id = $1`,
    [userId],
  );
  return studentResult.rows[0]?.id || null;
};

export const getAssignmentMeta = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    await ensureAssignmentColumns();

    const [classesResult, subjectsResult] = await Promise.all([
      query(
        `SELECT id, class_name, section_name, class_code
         FROM classes
         ORDER BY class_name ASC, section_name ASC`,
      ),
      query(
        `SELECT id, subject_name, subject_code
         FROM subjects
         WHERE is_active = true
         ORDER BY subject_name ASC`,
      ),
    ]);

    sendResponse(res, 200, "Assignment metadata retrieved successfully", {
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
    });
  },
);

export const listAssignments = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { classId, section, subjectId, studentId, status } = req.query;

    await ensureAssignmentColumns();

    let targetStudentId = (studentId as string) || null;

    if (req.user?.roleName === "student") {
      const myStudentId = await getStudentIdByUser(req.user.userId);
      if (!myStudentId) {
        return sendError(res, 404, "Student profile not found");
      }
      targetStudentId = myStudentId;
    }

    const filters: string[] = [];
    const params: any[] = [];

    if (classId) {
      params.push(classId);
      filters.push(`a.class_id = $${params.length}`);
    }

    if (section) {
      params.push(section);
      filters.push(`LOWER(c.section_name) = LOWER($${params.length})`);
    }

    if (subjectId) {
      params.push(subjectId);
      filters.push(`a.subject_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      filters.push(`a.status = $${params.length}`);
    }

    let targetStudentParamIndex: number | null = null;

    if (targetStudentId) {
      params.push(targetStudentId);
      targetStudentParamIndex = params.length;
      filters.push(
        `a.class_id IN (
          SELECT se.class_id
          FROM student_enrollments se
          WHERE se.student_id = $${targetStudentParamIndex} AND se.status = 'active'
        )`,
      );
    }

    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const studentJoin = targetStudentParamIndex
      ? `LEFT JOIN assignment_submissions asub
           ON asub.assignment_id = a.id
          AND asub.student_id = $${targetStudentParamIndex}`
      : "";

    const submissionSelect = targetStudentParamIndex
      ? `asub.id as submission_id,
        asub.submission_date,
        asub.marks_obtained,
        asub.status as submission_status`
      : `NULL::uuid as submission_id,
        NULL::timestamp as submission_date,
        NULL::integer as marks_obtained,
        NULL::text as submission_status`;

    const assignmentResult = await query(
      `SELECT
          a.id,
          a.title,
          a.description,
          a.file_url,
          a.due_date,
          a.total_marks,
          a.status,
          a.allow_resubmission,
          a.created_at,
          c.id as class_id,
          c.class_name,
          c.section_name,
          s.id as subject_id,
          s.subject_name,
          s.subject_code,
          t.id as teacher_id,
          u.first_name as teacher_first_name,
          u.last_name as teacher_last_name,
           ${submissionSelect}
       FROM assignments a
       JOIN classes c ON c.id = a.class_id
       JOIN subjects s ON s.id = a.subject_id
       JOIN teachers t ON t.id = a.teacher_id
       JOIN users u ON u.id = t.user_id
       ${studentJoin}
       ${whereClause}
       ORDER BY a.due_date ASC, a.created_at DESC`,
      params,
    );

    const data = assignmentResult.rows.map((row) => {
      let resolvedStatus = "pending";
      if (row.submission_status) {
        resolvedStatus = row.submission_status;
      } else if (new Date(row.due_date) < new Date()) {
        resolvedStatus = "late";
      }

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        fileUrl: row.file_url,
        dueDate: row.due_date,
        totalMarks: row.total_marks,
        status: row.status,
        allowResubmission: row.allow_resubmission,
        createdAt: row.created_at,
        class: {
          id: row.class_id,
          className: row.class_name,
          sectionName: row.section_name,
        },
        subject: {
          id: row.subject_id,
          subjectName: row.subject_name,
          subjectCode: row.subject_code,
        },
        teacher: {
          id: row.teacher_id,
          fullName: `${row.teacher_first_name} ${row.teacher_last_name}`,
        },
        submission: row.submission_id
          ? {
              id: row.submission_id,
              submissionDate: row.submission_date,
              marksObtained: row.marks_obtained,
              status: row.submission_status,
            }
          : null,
        submissionStatus: resolvedStatus,
      };
    });

    sendResponse(res, 200, "Assignments retrieved successfully", data);
  },
);

export const createAssignment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const {
      title,
      description,
      subjectId,
      classId,
      dueDate,
      totalMarks,
      fileUrl,
      allowResubmission,
      teacherId,
    } = req.body;

    if (!title || !subjectId || !classId || !dueDate) {
      return sendError(
        res,
        400,
        "title, subjectId, classId and dueDate are required",
      );
    }

    await ensureAssignmentColumns();

    let resolvedTeacherId = teacherId || null;
    if (!resolvedTeacherId && req.user?.roleName === "teacher") {
      resolvedTeacherId = await getTeacherIdByUser(req.user.userId);
    }

    if (!resolvedTeacherId) {
      const classTeacherResult = await query(
        `SELECT class_teacher_id FROM classes WHERE id = $1`,
        [classId],
      );
      resolvedTeacherId = classTeacherResult.rows[0]?.class_teacher_id || null;
    }

    if (!resolvedTeacherId) {
      return sendError(
        res,
        400,
        "teacherId is required when no class teacher is assigned",
      );
    }

    const insertResult = await query(
      `INSERT INTO assignments (
          class_id,
          subject_id,
          teacher_id,
          title,
          description,
          file_url,
          due_date,
          total_marks,
          allow_resubmission,
          status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
       RETURNING id, title, due_date, total_marks`,
      [
        classId,
        subjectId,
        resolvedTeacherId,
        title,
        description || null,
        fileUrl || null,
        dueDate,
        Number(totalMarks || 10),
        Boolean(allowResubmission),
      ],
    );

    sendResponse(res, 201, "Assignment created successfully", {
      id: insertResult.rows[0].id,
      title: insertResult.rows[0].title,
      dueDate: insertResult.rows[0].due_date,
      totalMarks: insertResult.rows[0].total_marks,
    });
  },
);

export const updateAssignment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { assignmentId } = req.params;
    const {
      title,
      description,
      subjectId,
      classId,
      dueDate,
      totalMarks,
      fileUrl,
      allowResubmission,
    } = req.body;

    await ensureAssignmentColumns();

    const existsResult = await query(
      `SELECT id FROM assignments WHERE id = $1`,
      [assignmentId],
    );

    if (existsResult.rowCount === 0) {
      return sendError(res, 404, "Assignment not found");
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      params.push(title);
      updates.push(`title = $${params.length}`);
    }

    if (description !== undefined) {
      params.push(description || null);
      updates.push(`description = $${params.length}`);
    }

    if (subjectId !== undefined) {
      params.push(subjectId);
      updates.push(`subject_id = $${params.length}`);
    }

    if (classId !== undefined) {
      params.push(classId);
      updates.push(`class_id = $${params.length}`);
    }

    if (dueDate !== undefined) {
      params.push(dueDate);
      updates.push(`due_date = $${params.length}`);
    }

    if (totalMarks !== undefined) {
      params.push(Number(totalMarks));
      updates.push(`total_marks = $${params.length}`);
    }

    if (fileUrl !== undefined) {
      params.push(fileUrl || null);
      updates.push(`file_url = $${params.length}`);
    }

    if (allowResubmission !== undefined) {
      params.push(Boolean(allowResubmission));
      updates.push(`allow_resubmission = $${params.length}`);
    }

    if (updates.length === 0) {
      return sendError(res, 400, "No fields provided for update");
    }

    params.push(assignmentId);

    await query(
      `UPDATE assignments
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${params.length}`,
      params,
    );

    sendResponse(res, 200, "Assignment updated successfully");
  },
);

export const updateAssignmentStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { assignmentId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["active", "closed", "archived"];
    if (!status || !allowedStatuses.includes(status)) {
      return sendError(
        res,
        400,
        "status must be one of: active, closed, archived",
      );
    }

    const result = await query(
      `UPDATE assignments
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status`,
      [status, assignmentId],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Assignment not found");
    }

    sendResponse(res, 200, "Assignment status updated successfully", {
      id: result.rows[0].id,
      status: result.rows[0].status,
    });
  },
);

export const deleteAssignment = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const { assignmentId } = _req.params;

    const result = await query(
      `DELETE FROM assignments WHERE id = $1 RETURNING id`,
      [assignmentId],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Assignment not found");
    }

    sendResponse(res, 200, "Assignment deleted successfully");
  },
);

export const getAssignmentById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { assignmentId } = req.params;

    await ensureAssignmentColumns();

    const assignmentResult = await query(
      `SELECT
          a.id,
          a.title,
          a.description,
          a.file_url,
          a.due_date,
          a.total_marks,
          a.status,
          a.allow_resubmission,
          a.class_id,
          c.class_name,
          c.section_name,
          a.subject_id,
          s.subject_name,
          s.subject_code,
          a.teacher_id,
          u.first_name as teacher_first_name,
          u.last_name as teacher_last_name
       FROM assignments a
       JOIN classes c ON c.id = a.class_id
       JOIN subjects s ON s.id = a.subject_id
       JOIN teachers t ON t.id = a.teacher_id
       JOIN users u ON u.id = t.user_id
       WHERE a.id = $1`,
      [assignmentId],
    );

    if (assignmentResult.rowCount === 0) {
      return sendError(res, 404, "Assignment not found");
    }

    let mySubmission: any = null;
    if (req.user?.roleName === "student") {
      const studentId = await getStudentIdByUser(req.user.userId);
      if (studentId) {
        const submissionResult = await query(
          `SELECT id, submission_date, file_url, submission_text, marks_obtained, feedback, status
           FROM assignment_submissions
           WHERE assignment_id = $1 AND student_id = $2`,
          [assignmentId, studentId],
        );
        mySubmission = submissionResult.rows[0] || null;
      }
    }

    const row = assignmentResult.rows[0];
    sendResponse(res, 200, "Assignment retrieved successfully", {
      id: row.id,
      title: row.title,
      description: row.description,
      fileUrl: row.file_url,
      dueDate: row.due_date,
      totalMarks: row.total_marks,
      status: row.status,
      allowResubmission: row.allow_resubmission,
      class: {
        id: row.class_id,
        className: row.class_name,
        sectionName: row.section_name,
      },
      subject: {
        id: row.subject_id,
        subjectName: row.subject_name,
        subjectCode: row.subject_code,
      },
      teacher: {
        id: row.teacher_id,
        fullName: `${row.teacher_first_name} ${row.teacher_last_name}`,
      },
      mySubmission,
    });
  },
);

export const getStudentAssignmentDashboard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    let targetStudentId: string | null = null;

    if (req.user?.roleName === "student") {
      targetStudentId = await getStudentIdByUser(req.user.userId);
      if (!targetStudentId) {
        return sendError(res, 404, "Student profile not found");
      }
    } else {
      targetStudentId = (req.query.studentId as string) || null;
      if (!targetStudentId) {
        return sendError(
          res,
          400,
          "studentId is required for non-student roles",
        );
      }
    }

    await ensureAssignmentColumns();

    const dashboardResult = await query(
      `SELECT
          a.id,
          a.title,
          a.description,
          a.file_url,
          a.due_date,
          a.total_marks,
          a.allow_resubmission,
          c.class_name,
          c.section_name,
          s.subject_name,
          s.subject_code,
          asub.id as submission_id,
          asub.submission_date,
          asub.status as submission_status,
          asub.marks_obtained,
          asub.feedback
       FROM student_enrollments se
       JOIN assignments a ON a.class_id = se.class_id AND a.status = 'active'
       JOIN classes c ON c.id = a.class_id
       JOIN subjects s ON s.id = a.subject_id
       LEFT JOIN assignment_submissions asub
         ON asub.assignment_id = a.id
        AND asub.student_id = se.student_id
       WHERE se.student_id = $1 AND se.status = 'active'
       ORDER BY a.due_date ASC`,
      [targetStudentId],
    );

    const data = dashboardResult.rows.map((row) => {
      let submissionStatus = "pending";

      if (row.submission_status) {
        submissionStatus = row.submission_status;
      } else if (new Date(row.due_date) < new Date()) {
        submissionStatus = "late";
      }

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        fileUrl: row.file_url,
        dueDate: row.due_date,
        totalMarks: row.total_marks,
        allowResubmission: row.allow_resubmission,
        className: row.class_name,
        sectionName: row.section_name,
        subjectName: row.subject_name,
        subjectCode: row.subject_code,
        submission: row.submission_id
          ? {
              id: row.submission_id,
              submissionDate: row.submission_date,
              status: row.submission_status,
              marksObtained: row.marks_obtained,
              feedback: row.feedback,
            }
          : null,
        submissionStatus,
      };
    });

    sendResponse(res, 200, "Student assignment dashboard retrieved", data);
  },
);

export const submitAssignment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { assignmentId } = req.params;
    const { submissionText, fileUrl } = req.body;

    const studentId = await getStudentIdByUser(req.user!.userId);
    if (!studentId) {
      return sendError(res, 404, "Student profile not found");
    }

    await ensureAssignmentColumns();

    const assignmentResult = await query(
      `SELECT id, due_date, allow_resubmission
       FROM assignments
       WHERE id = $1`,
      [assignmentId],
    );

    if (assignmentResult.rowCount === 0) {
      return sendError(res, 404, "Assignment not found");
    }

    const assignment = assignmentResult.rows[0];
    const existingSubmissionResult = await query(
      `SELECT id, resubmission_count
       FROM assignment_submissions
       WHERE assignment_id = $1 AND student_id = $2`,
      [assignmentId, studentId],
    );

    const dueDate = new Date(assignment.due_date);
    dueDate.setHours(23, 59, 59, 999);
    const isLate = new Date() > dueDate;
    const submissionStatus = isLate ? "late" : "submitted";

    if (existingSubmissionResult.rowCount > 0) {
      if (!assignment.allow_resubmission) {
        return sendError(
          res,
          400,
          "Resubmission is not allowed for this assignment",
        );
      }

      const existing = existingSubmissionResult.rows[0];
      await query(
        `UPDATE assignment_submissions
         SET submission_date = NOW(),
             file_url = $1,
             submission_text = $2,
             status = $3,
             resubmission_count = COALESCE(resubmission_count, 0) + 1,
             updated_at = NOW()
         WHERE id = $4`,
        [
          fileUrl || null,
          submissionText || null,
          submissionStatus,
          existing.id,
        ],
      );

      return sendResponse(res, 200, "Assignment resubmitted successfully", {
        submissionId: existing.id,
      });
    }

    const submissionResult = await query(
      `INSERT INTO assignment_submissions (
          assignment_id,
          student_id,
          submission_date,
          file_url,
          submission_text,
          status
       ) VALUES ($1, $2, NOW(), $3, $4, $5)
       RETURNING id`,
      [
        assignmentId,
        studentId,
        fileUrl || null,
        submissionText || null,
        submissionStatus,
      ],
    );

    sendResponse(res, 201, "Assignment submitted successfully", {
      submissionId: submissionResult.rows[0].id,
    });
  },
);

export const getAssignmentGradingPanel = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { assignmentId } = req.params;

    await ensureAssignmentColumns();

    const assignmentResult = await query(
      `SELECT
          a.id,
          a.title,
          a.due_date,
          a.total_marks,
          a.class_id,
          c.class_name,
          c.section_name,
          s.subject_name,
          s.subject_code
       FROM assignments a
       JOIN classes c ON c.id = a.class_id
       JOIN subjects s ON s.id = a.subject_id
       WHERE a.id = $1`,
      [assignmentId],
    );

    if (assignmentResult.rowCount === 0) {
      return sendError(res, 404, "Assignment not found");
    }

    const assignment = assignmentResult.rows[0];
    const studentsResult = await query(
      `SELECT
          st.id as student_id,
          st.admission_number,
          u.first_name,
          u.last_name,
          asub.id as submission_id,
          asub.submission_date,
          asub.file_url,
          asub.submission_text,
          asub.marks_obtained,
          asub.feedback,
          asub.status
       FROM student_enrollments se
       JOIN students st ON st.id = se.student_id
       JOIN users u ON u.id = st.user_id
       LEFT JOIN assignment_submissions asub
         ON asub.assignment_id = $1
        AND asub.student_id = st.id
       WHERE se.class_id = $2 AND se.status = 'active'
       ORDER BY st.admission_number ASC`,
      [assignmentId, assignment.class_id],
    );

    const students = studentsResult.rows.map((row) => ({
      studentId: row.student_id,
      studentName: `${row.first_name} ${row.last_name}`,
      admissionNumber: row.admission_number,
      submission: row.submission_id
        ? {
            id: row.submission_id,
            submissionDate: row.submission_date,
            fileUrl: row.file_url,
            submissionText: row.submission_text,
            marksObtained: row.marks_obtained,
            feedback: row.feedback,
            status: row.status,
          }
        : null,
    }));

    sendResponse(res, 200, "Assignment grading panel retrieved", {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        dueDate: assignment.due_date,
        totalMarks: assignment.total_marks,
        className: assignment.class_name,
        sectionName: assignment.section_name,
        subjectName: assignment.subject_name,
        subjectCode: assignment.subject_code,
      },
      students,
    });
  },
);

export const gradeAssignmentSubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const { submissionId } = req.params;
    const { marksObtained, feedback } = req.body;

    if (marksObtained === undefined || marksObtained === null) {
      return sendError(res, 400, "marksObtained is required");
    }

    const submissionResult = await query(
      `SELECT asub.id, a.total_marks
       FROM assignment_submissions asub
       JOIN assignments a ON a.id = asub.assignment_id
       WHERE asub.id = $1`,
      [submissionId],
    );

    if (submissionResult.rowCount === 0) {
      return sendError(res, 404, "Submission not found");
    }

    const totalMarks = Number(submissionResult.rows[0].total_marks || 0);
    const numericMarks = Number(marksObtained);

    if (numericMarks < 0 || (totalMarks > 0 && numericMarks > totalMarks)) {
      return sendError(
        res,
        400,
        `marksObtained must be between 0 and ${totalMarks}`,
      );
    }

    await query(
      `UPDATE assignment_submissions
       SET marks_obtained = $1,
           feedback = $2,
           status = 'graded',
           graded_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [numericMarks, feedback || null, submissionId],
    );

    sendResponse(res, 200, "Submission graded successfully", {
      submissionId,
      marksObtained: numericMarks,
    });
  },
);
