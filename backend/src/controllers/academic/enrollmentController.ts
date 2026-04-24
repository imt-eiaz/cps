import { Response } from "express";
import { query } from "../../config/database.js";
import {
  sendResponse,
  sendError,
  sendPaginatedResponse,
} from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { AuthRequest } from "../../middleware/auth.js";

// Get all enrollments with filters
export const getAllEnrollments = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const {
      page = 1,
      limit = 10,
      classId,
      studentId,
      status = "active",
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let whereConditions = ["se.status = $1"];
    let queryParams: any[] = [status];
    let paramIndex = 2;

    if (classId) {
      whereConditions.push(`se.class_id = $${paramIndex}`);
      queryParams.push(classId);
      paramIndex++;
    }

    if (studentId) {
      whereConditions.push(`se.student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM student_enrollments se WHERE ${whereClause}`,
      queryParams,
    );
    const total = parseInt(countResult.rows[0].count);

    // Get enrollments with student and class details
    const result = await query(
      `SELECT se.id, se.student_id, se.class_id, se.enrollment_date, se.status,
              u.first_name as student_first_name, u.last_name as student_last_name,
              u.email as student_email, s.admission_number,
              c.class_name, c.section_name, c.class_code,
              ay.year_name
       FROM student_enrollments se
       JOIN students s ON se.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON se.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE ${whereClause}
       ORDER BY se.enrollment_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, Number(limit), offset],
    );

    const enrollments = result.rows.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: `${row.student_first_name} ${row.student_last_name}`,
      studentEmail: row.student_email,
      admissionNumber: row.admission_number,
      classId: row.class_id,
      className: row.class_name,
      sectionName: row.section_name,
      classCode: row.class_code,
      academicYear: row.year_name,
      enrollmentDate: row.enrollment_date,
      status: row.status,
    }));

    sendPaginatedResponse(res, 200, enrollments, {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    });
  },
);

// Get enrollment by ID
export const getEnrollmentById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT se.id, se.student_id, se.class_id, se.enrollment_date, se.status,
              u.first_name as student_first_name, u.last_name as student_last_name,
              u.email as student_email, s.admission_number,
              c.class_name, c.section_name, c.class_code, c.student_capacity,
              ay.year_name
       FROM student_enrollments se
       JOIN students s ON se.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON se.class_id = c.id
       JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE se.id = $1`,
      [id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Enrollment not found");
    }

    const row = result.rows[0];
    sendResponse(res, 200, "Enrollment retrieved successfully", {
      id: row.id,
      studentId: row.student_id,
      studentName: `${row.student_first_name} ${row.student_last_name}`,
      studentEmail: row.student_email,
      admissionNumber: row.admission_number,
      classId: row.class_id,
      className: row.class_name,
      sectionName: row.section_name,
      classCode: row.class_code,
      studentCapacity: row.student_capacity,
      academicYear: row.year_name,
      enrollmentDate: row.enrollment_date,
      status: row.status,
    });
  },
);

// Create new enrollment
export const createEnrollment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { studentId, classId, enrollmentDate, status = "active" } = req.body;

    // Validate required fields
    if (!studentId || !classId || !enrollmentDate) {
      return sendError(
        res,
        400,
        "Student ID, class ID, and enrollment date are required",
      );
    }

    // Check if student exists
    const studentCheck = await query("SELECT id FROM students WHERE id = $1", [
      studentId,
    ]);
    if (studentCheck.rowCount === 0) {
      return sendError(res, 404, "Student not found");
    }

    // Check if class exists
    const classCheck = await query(
      "SELECT id, student_capacity FROM classes WHERE id = $1",
      [classId],
    );
    if (classCheck.rowCount === 0) {
      return sendError(res, 404, "Class not found");
    }

    // Check if enrollment already exists
    const enrollmentCheck = await query(
      "SELECT id FROM student_enrollments WHERE student_id = $1 AND class_id = $2",
      [studentId, classId],
    );
    if (enrollmentCheck.rowCount && enrollmentCheck.rowCount > 0) {
      return sendError(res, 409, "Student is already enrolled in this class");
    }

    // Check class capacity
    const capacityCheck = await query(
      "SELECT COUNT(*) FROM student_enrollments WHERE class_id = $1 AND status = 'active'",
      [classId],
    );
    const currentEnrollment = parseInt(capacityCheck.rows[0].count);
    const capacity = classCheck.rows[0].student_capacity;

    if (currentEnrollment >= capacity) {
      return sendError(
        res,
        400,
        `Class is at full capacity (${capacity} students)`,
      );
    }

    // Create enrollment
    const result = await query(
      `INSERT INTO student_enrollments (student_id, class_id, enrollment_date, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [studentId, classId, enrollmentDate, status],
    );

    sendResponse(res, 201, "Student enrolled successfully", result.rows[0]);
  },
);

// Update enrollment status
export const updateEnrollmentStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 400, "Status is required");
    }

    const validStatuses = ["active", "inactive", "graduated", "transferred"];
    if (!validStatuses.includes(status)) {
      return sendError(
        res,
        400,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }

    const result = await query(
      `UPDATE student_enrollments 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Enrollment not found");
    }

    sendResponse(
      res,
      200,
      "Enrollment status updated successfully",
      result.rows[0],
    );
  },
);

// Delete enrollment
export const deleteEnrollment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const result = await query(
      "DELETE FROM student_enrollments WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Enrollment not found");
    }

    sendResponse(res, 200, "Enrollment deleted successfully");
  },
);

// Get available students (not enrolled in a specific class)
export const getAvailableStudents = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { classId } = req.query;

    if (!classId) {
      return sendError(res, 400, "Class ID is required");
    }

    const result = await query(
      `SELECT s.id, u.first_name, u.last_name, u.email, s.admission_number, s.status
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'active'
         AND s.id NOT IN (
           SELECT student_id FROM student_enrollments 
           WHERE class_id = $1 AND status = 'active'
         )
       ORDER BY u.first_name ASC`,
      [classId],
    );

    const students = result.rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      email: row.email,
      admissionNumber: row.admission_number,
      status: row.status,
    }));

    sendResponse(
      res,
      200,
      "Available students retrieved successfully",
      students,
    );
  },
);

// Get enrollment statistics
export const getEnrollmentStats = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const stats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_enrollments,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_enrollments,
        COUNT(*) FILTER (WHERE status = 'graduated') as graduated_enrollments,
        COUNT(*) FILTER (WHERE status = 'transferred') as transferred_enrollments,
        COUNT(DISTINCT student_id) as total_enrolled_students,
        COUNT(DISTINCT class_id) as classes_with_enrollments
      FROM student_enrollments
    `);

    sendResponse(
      res,
      200,
      "Enrollment statistics retrieved successfully",
      stats.rows[0],
    );
  },
);
