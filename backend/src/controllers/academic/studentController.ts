import { Request, Response } from "express";
import { query } from "../../config/database.js";
import {
  sendResponse,
  sendError,
  sendPaginatedResponse,
} from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { AuthRequest } from "../../middleware/auth.js";

// Get all students with pagination
export const getAllStudents = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const total = await query("SELECT COUNT(*) FROM students");
    const totalCount = parseInt(total.rows[0].count);

    const result = await query(
      `SELECT s.id, s.user_id, u.email, u.first_name, u.last_name, 
       s.admission_number, s.admission_date, s.status, s.date_of_birth, s.gender
       FROM students s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.admission_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    sendPaginatedResponse(
      res,
      200,
      result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        admissionNumber: row.admission_number,
        admissionDate: row.admission_date,
        dateOfBirth: row.date_of_birth,
        gender: row.gender,
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

// Get current authenticated student's profile
export const getMyStudentProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.userId) {
      return sendError(res, 401, "Not authenticated");
    }

    const result = await query(
      `SELECT s.id, s.user_id, u.email, u.first_name, u.last_name,
              s.admission_number, s.status
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1`,
      [req.user.userId],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Student profile not found");
    }

    const row = result.rows[0];
    sendResponse(res, 200, "Student profile retrieved successfully", {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      admissionNumber: row.admission_number,
      status: row.status,
    });
  },
);

// Get student by ID
export const getStudentById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT s.*, u.email, u.first_name, u.last_name, u.phone
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Student not found");
    }

    const student = result.rows[0];
    sendResponse(res, 200, "Student retrieved successfully", {
      id: student.id,
      userId: student.user_id,
      email: student.email,
      firstName: student.first_name,
      lastName: student.last_name,
      admissionNumber: student.admission_number,
      admissionDate: student.admission_date,
      dateOfBirth: student.date_of_birth,
      gender: student.gender,
      fatherName: student.father_name,
      motherName: student.mother_name,
      guardianContact: student.guardian_contact,
      bloodGroup: student.blood_group,
      medicalConditions: student.medical_conditions,
      address: student.address,
      status: student.status,
      phone: student.phone,
    });
  },
);

// Create new student
export const createStudent = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      userId,
      admissionNumber,
      admissionDate,
      dateOfBirth,
      gender,
      fatherName,
      motherName,
      guardianContact,
      bloodGroup,
      medicalConditions,
      address,
    } = req.body;

    if (!userId || !admissionNumber || !admissionDate || !dateOfBirth) {
      return sendError(res, 400, "Missing required fields");
    }

    // Check if admission number already exists
    const exists = await query(
      "SELECT id FROM students WHERE admission_number = $1",
      [admissionNumber],
    );

    if (exists.rowCount && exists.rowCount > 0) {
      return sendError(res, 409, "Admission number already exists");
    }

    const result = await query(
      `INSERT INTO students (user_id, admission_number, admission_date, date_of_birth, gender, 
       father_name, mother_name, guardian_contact, blood_group, medical_conditions, address, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, user_id, admission_number, admission_date, status`,
      [
        userId,
        admissionNumber,
        admissionDate,
        dateOfBirth,
        gender,
        fatherName,
        motherName,
        guardianContact,
        bloodGroup,
        medicalConditions,
        address,
        "active",
      ],
    );

    sendResponse(res, 201, "Student created successfully", result.rows[0]);
  },
);

// Update student
export const updateStudent = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = [
      "date_of_birth",
      "gender",
      "father_name",
      "mother_name",
      "guardian_contact",
      "blood_group",
      "medical_conditions",
      "address",
      "status",
    ];
    const fields = Object.keys(updates).filter((key) =>
      allowedFields.includes(key),
    );

    if (fields.length === 0) {
      return sendError(res, 400, "No valid fields to update");
    }

    const setClause = fields
      .map((field, i) => `${field} = $${i + 1}`)
      .join(", ");
    const values = fields.map((field) => updates[field]);

    const result = await query(
      `UPDATE students SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1}
       RETURNING id, user_id, admission_number, status`,
      [...values, id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Student not found");
    }

    sendResponse(res, 200, "Student updated successfully", result.rows[0]);
  },
);

// Delete student
export const deleteStudent = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query("DELETE FROM students WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return sendError(res, 404, "Student not found");
    }

    sendResponse(res, 200, "Student deleted successfully");
  },
);

// Get student attendance
export const getStudentAttendance = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    let query_str = `SELECT a.id, a.attendance_date, a.status, a.remarks
                     FROM attendance a
                     WHERE a.student_id = $1`;
    const params: any[] = [id];

    if (startDate) {
      query_str += ` AND a.attendance_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query_str += ` AND a.attendance_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query_str += ` ORDER BY a.attendance_date DESC`;

    const result = await query(query_str, params);

    sendResponse(res, 200, "Attendance retrieved successfully", result.rows);
  },
);

// Get student marks
export const getStudentMarks = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT m.id, m.exam_id, e.exam_name, m.subject_id, s.subject_name,
       m.obtained_marks, m.total_marks, m.grade
       FROM marks m
       JOIN exams e ON m.exam_id = e.id
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.student_id = $1
       ORDER BY e.start_date DESC`,
      [id],
    );

    sendResponse(res, 200, "Marks retrieved successfully", result.rows);
  },
);
