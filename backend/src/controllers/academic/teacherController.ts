import { Request, Response } from "express";
import { query } from "../../config/database.js";
import {
  sendResponse,
  sendError,
  sendPaginatedResponse,
} from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { AuthRequest } from "../../middleware/auth.js";

// Get all teachers with pagination
export const getAllTeachers = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const total = await query("SELECT COUNT(*) FROM teachers");
    const totalCount = parseInt(total.rows[0].count);

    const result = await query(
      `SELECT t.id, t.user_id, u.email, u.first_name, u.last_name, 
       t.employee_id, t.date_of_joining, t.qualification, t.specialization, 
       t.experience_years, t.status, t.gender
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.date_of_joining DESC
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
        employeeId: row.employee_id,
        dateOfJoining: row.date_of_joining,
        qualification: row.qualification,
        specialization: row.specialization,
        experienceYears: row.experience_years,
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

// Get teacher by ID
export const getTeacherById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT t.*, u.email, u.first_name, u.last_name, u.phone
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Teacher not found");
    }

    const teacher = result.rows[0];
    sendResponse(res, 200, "Teacher retrieved successfully", {
      id: teacher.id,
      userId: teacher.user_id,
      email: teacher.email,
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      phone: teacher.phone,
      employeeId: teacher.employee_id,
      dateOfJoining: teacher.date_of_joining,
      dateOfBirth: teacher.date_of_birth,
      gender: teacher.gender,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      experienceYears: teacher.experience_years,
      address: teacher.address,
      city: teacher.city,
      state: teacher.state,
      postalCode: teacher.postal_code,
      status: teacher.status,
    });
  },
);

// Create new teacher
export const createTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      userId,
      employeeId,
      dateOfJoining,
      dateOfBirth,
      gender,
      qualification,
      specialization,
      experienceYears,
      address,
      city,
      state,
      postalCode,
    } = req.body;

    if (!userId || !employeeId || !dateOfJoining) {
      return sendError(res, 400, "Missing required fields");
    }

    // Check if teacher already exists
    const existingTeacher = await query(
      "SELECT id FROM teachers WHERE employee_id = $1",
      [employeeId],
    );

    if (existingTeacher.rowCount && existingTeacher.rowCount > 0) {
      return sendError(
        res,
        409,
        "Teacher with this employee ID already exists",
      );
    }

    const result = await query(
      `INSERT INTO teachers (user_id, employee_id, date_of_joining, date_of_birth, 
       gender, qualification, specialization, experience_years, address, city, state, postal_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        userId,
        employeeId,
        dateOfJoining,
        dateOfBirth || null,
        gender || null,
        qualification || null,
        specialization || null,
        experienceYears || 0,
        address || null,
        city || null,
        state || null,
        postalCode || null,
        "active",
      ],
    );

    sendResponse(res, 201, "Teacher created successfully", result.rows[0]);
  },
);

// Update teacher
export const updateTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      dateOfBirth,
      gender,
      qualification,
      specialization,
      experienceYears,
      address,
      city,
      state,
      postalCode,
      status,
    } = req.body;

    const updates: any = {};
    if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth;
    if (gender !== undefined) updates.gender = gender;
    if (qualification !== undefined) updates.qualification = qualification;
    if (specialization !== undefined) updates.specialization = specialization;
    if (experienceYears !== undefined)
      updates.experience_years = experienceYears;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (postalCode !== undefined) updates.postal_code = postalCode;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, "No fields to update");
    }

    const fields = Object.keys(updates);
    const setClause = fields
      .map((field, i) => `${field} = $${i + 1}`)
      .join(", ");
    const values = fields.map((field) => updates[field]);

    const result = await query(
      `UPDATE teachers SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1}
       RETURNING *`,
      [...values, id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Teacher not found");
    }

    sendResponse(res, 200, "Teacher updated successfully", result.rows[0]);
  },
);

// Delete teacher
export const deleteTeacher = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query("DELETE FROM teachers WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return sendError(res, 404, "Teacher not found");
    }

    sendResponse(res, 200, "Teacher deleted successfully");
  },
);

// Get teacher's classes
export const getTeacherClasses = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT DISTINCT c.id, c.class_name, c.section_name, c.class_code
       FROM teachers t
       JOIN class_subjects cs ON t.id = cs.teacher_id
       JOIN classes c ON cs.class_id = c.id
       WHERE t.id = $1`,
      [id],
    );

    sendResponse(
      res,
      200,
      "Teacher classes retrieved successfully",
      result.rows,
    );
  },
);

// Get teacher's subjects
export const getTeacherSubjects = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT DISTINCT s.id, s.subject_code, s.subject_name
       FROM teachers t
       JOIN class_subjects cs ON t.id = cs.teacher_id
       JOIN subjects s ON cs.subject_id = s.id
       WHERE t.id = $1`,
      [id],
    );

    sendResponse(
      res,
      200,
      "Teacher subjects retrieved successfully",
      result.rows,
    );
  },
);

// Change teacher status
export const changeTeacherStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "on_leave", "resigned"].includes(status)) {
      return sendError(res, 400, "Invalid status");
    }

    const result = await query(
      "UPDATE teachers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status",
      [status, id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Teacher not found");
    }

    sendResponse(
      res,
      200,
      "Teacher status updated successfully",
      result.rows[0],
    );
  },
);
