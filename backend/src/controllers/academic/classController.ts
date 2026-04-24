import { Request, Response } from "express";
import { query } from "../../config/database.js";
import {
  sendResponse,
  sendError,
  sendPaginatedResponse,
} from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { AuthRequest } from "../../middleware/auth.js";

// Get all classes with pagination
export const getAllClasses = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const total = await query("SELECT COUNT(*) FROM classes");
    const totalCount = parseInt(total.rows[0].count);

    const result = await query(
      `SELECT c.id, c.class_name, c.section_name, c.class_code, 
              c.student_capacity, c.description, ay.year_name,
              u.first_name as teacher_first_name, u.last_name as teacher_last_name,
              COUNT(DISTINCT se.student_id) as enrolled_students
       FROM classes c
       LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
       LEFT JOIN teachers t ON c.class_teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN student_enrollments se ON c.id = se.class_id
       GROUP BY c.id, ay.year_name, u.first_name, u.last_name
       ORDER BY ay.year_name DESC, c.class_name ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    sendPaginatedResponse(
      res,
      200,
      result.rows.map((row) => ({
        id: row.id,
        className: row.class_name,
        sectionName: row.section_name,
        classCode: row.class_code,
        studentCapacity: row.student_capacity,
        description: row.description,
        academicYear: row.year_name,
        classTeacher:
          row.teacher_first_name && row.teacher_last_name
            ? `${row.teacher_first_name} ${row.teacher_last_name}`
            : "Not Assigned",
        enrolledStudents: parseInt(row.enrolled_students) || 0,
      })),
      {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    );
  },
);

// Get class by ID
export const getClassById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, ay.year_name, ay.start_date as ay_start_date, ay.end_date as ay_end_date,
              u.first_name as teacher_first_name, u.last_name as teacher_last_name, 
              t.employee_id as teacher_employee_id
       FROM classes c
       LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
       LEFT JOIN teachers t ON c.class_teacher_id = t.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE c.id = $1`,
      [id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Class not found");
    }

    const classData = result.rows[0];

    // Get enrolled students
    const studentsResult = await query(
      `SELECT s.id, u.first_name, u.last_name, u.email, s.admission_number, 
              se.enrollment_date, se.status
       FROM student_enrollments se
       JOIN students s ON se.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE se.class_id = $1 AND se.status = 'active'
       ORDER BY u.first_name ASC`,
      [id],
    );

    // Get subjects taught
    const subjectsResult = await query(
      `SELECT DISTINCT s.id, s.subject_code, s.subject_name, 
              u.first_name as teacher_first_name, u.last_name as teacher_last_name
       FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       JOIN teachers t ON cs.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE cs.class_id = $1
       ORDER BY s.subject_name ASC`,
      [id],
    );

    sendResponse(res, 200, "Class retrieved successfully", {
      id: classData.id,
      className: classData.class_name,
      sectionName: classData.section_name,
      classCode: classData.class_code,
      studentCapacity: classData.student_capacity,
      description: classData.description,
      academicYear: classData.year_name,
      academicYearStartDate: classData.ay_start_date,
      academicYearEndDate: classData.ay_end_date,
      classTeacher:
        classData.teacher_first_name && classData.teacher_last_name
          ? {
              name: `${classData.teacher_first_name} ${classData.teacher_last_name}`,
              employeeId: classData.teacher_employee_id,
            }
          : null,
      enrolledStudents: studentsResult.rows.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        admissionNumber: row.admission_number,
        enrollmentDate: row.enrollment_date,
        status: row.status,
      })),
      subjects: subjectsResult.rows.map((row) => ({
        id: row.id,
        subjectCode: row.subject_code,
        subjectName: row.subject_name,
        teacher: `${row.teacher_first_name} ${row.teacher_last_name}`,
      })),
      totalEnrolledStudents: studentsResult.rowCount || 0,
      availableCapacity:
        classData.student_capacity - (studentsResult.rowCount || 0),
    });
  },
);

// Create new class
export const createClass = asyncHandler(async (req: Request, res: Response) => {
  const {
    academicYearId,
    className,
    sectionName,
    classCode,
    classTeacherId,
    studentCapacity,
    description,
  } = req.body;

  if (!academicYearId || !className || !classCode) {
    return sendError(res, 400, "Missing required fields");
  }

  // Check if class code already exists
  const existingClass = await query(
    "SELECT id FROM classes WHERE class_code = $1",
    [classCode],
  );

  if (existingClass.rowCount && existingClass.rowCount > 0) {
    return sendError(res, 409, "Class code already exists");
  }

  const result = await query(
    `INSERT INTO classes (academic_year_id, class_name, section_name, class_code, 
     class_teacher_id, student_capacity, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      academicYearId,
      className,
      sectionName || null,
      classCode,
      classTeacherId || null,
      studentCapacity || 40,
      description || null,
    ],
  );

  sendResponse(res, 201, "Class created successfully", result.rows[0]);
});

// Update class
export const updateClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    className,
    sectionName,
    classTeacherId,
    studentCapacity,
    description,
  } = req.body;

  const updates: any = {};
  if (className !== undefined) updates.class_name = className;
  if (sectionName !== undefined) updates.section_name = sectionName;
  if (classTeacherId !== undefined) updates.class_teacher_id = classTeacherId;
  if (studentCapacity !== undefined) updates.student_capacity = studentCapacity;
  if (description !== undefined) updates.description = description;

  if (Object.keys(updates).length === 0) {
    return sendError(res, 400, "No fields to update");
  }

  const fields = Object.keys(updates);
  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  const values = fields.map((field) => updates[field]);

  const result = await query(
    `UPDATE classes SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1}
     RETURNING *`,
    [...values, id],
  );

  if (result.rowCount === 0) {
    return sendError(res, 404, "Class not found");
  }

  sendResponse(res, 200, "Class updated successfully", result.rows[0]);
});

// Delete class
export const deleteClass = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query("DELETE FROM classes WHERE id = $1", [id]);

  if (result.rowCount === 0) {
    return sendError(res, 404, "Class not found");
  }

  sendResponse(res, 200, "Class deleted successfully");
});

// Get class subjects
export const getClassSubjects = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT cs.id, s.subject_code, s.subject_name, s.credit_hours,
              u.first_name, u.last_name, t.employee_id
       FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       JOIN teachers t ON cs.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE cs.class_id = $1
       ORDER BY s.subject_name ASC`,
      [id],
    );

    sendResponse(
      res,
      200,
      "Class subjects retrieved successfully",
      result.rows,
    );
  },
);

// Get class students
export const getClassStudents = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const total = await query(
      "SELECT COUNT(*) FROM student_enrollments WHERE class_id = $1 AND status = $2",
      [id, "active"],
    );
    const totalCount = parseInt(total.rows[0].count);

    const result = await query(
      `SELECT s.id, u.first_name, u.last_name, u.email, s.admission_number,
              s.date_of_birth, s.gender, se.enrollment_date, se.status
       FROM student_enrollments se
       JOIN students s ON se.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE se.class_id = $1 AND se.status = $2
       ORDER BY u.first_name ASC
       LIMIT $3 OFFSET $4`,
      [id, "active", limit, offset],
    );

    sendPaginatedResponse(
      res,
      200,
      result.rows.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        admissionNumber: row.admission_number,
        dateOfBirth: row.date_of_birth,
        gender: row.gender,
        enrollmentDate: row.enrollment_date,
        status: row.status,
      })),
      {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    );
  },
);

// Get all academic years
export const getAcademicYears = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await query(
      `SELECT id, year_name, start_date, end_date, is_active
       FROM academic_years
       ORDER BY year_name DESC`,
    );

    sendResponse(
      res,
      200,
      "Academic years retrieved successfully",
      result.rows.map((row) => ({
        id: row.id,
        yearName: row.year_name,
        startDate: row.start_date,
        endDate: row.end_date,
        isActive: row.is_active,
      })),
    );
  },
);

// Create academic year
export const createAcademicYear = asyncHandler(
  async (req: Request, res: Response) => {
    const { yearName, startDate, endDate, isActive } = req.body;

    if (!yearName || !startDate || !endDate) {
      return sendError(res, 400, "Missing required fields");
    }

    // Check if year already exists
    const existing = await query(
      "SELECT id FROM academic_years WHERE year_name = $1",
      [yearName],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      return sendError(res, 409, "Academic year already exists");
    }

    const result = await query(
      `INSERT INTO academic_years (year_name, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, year_name, start_date, end_date, is_active`,
      [yearName, startDate, endDate, isActive || false],
    );

    sendResponse(res, 201, "Academic year created successfully", {
      id: result.rows[0].id,
      yearName: result.rows[0].year_name,
      startDate: result.rows[0].start_date,
      endDate: result.rows[0].end_date,
      isActive: result.rows[0].is_active,
    });
  },
);
