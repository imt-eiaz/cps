import { Request, Response } from "express";
import { query } from "../../config/database.js";
import {
  sendResponse,
  sendError,
  sendPaginatedResponse,
} from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

let subjectStatusColumnChecked = false;

const ensureSubjectStatusColumn = async (): Promise<void> => {
  if (subjectStatusColumnChecked) {
    return;
  }

  await query(
    "ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
  );

  subjectStatusColumnChecked = true;
};

export const getAllSubjects = asyncHandler(
  async (req: Request, res: Response) => {
    await ensureSubjectStatusColumn();

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.trim() || "";
    const offset = (page - 1) * limit;

    const hasSearch = search.length > 0;
    const searchClause = hasSearch
      ? "WHERE subject_name ILIKE $1 OR subject_code ILIKE $1"
      : "";
    const searchValue = `%${search}%`;

    const countResult = hasSearch
      ? await query(`SELECT COUNT(*) FROM subjects ${searchClause}`, [
          searchValue,
        ])
      : await query("SELECT COUNT(*) FROM subjects");

    const total = parseInt(countResult.rows[0].count);

    const dataResult = hasSearch
      ? await query(
          `SELECT id, subject_name, subject_code, description, is_active, created_at
           FROM subjects
           ${searchClause}
           ORDER BY subject_name ASC
           LIMIT $2 OFFSET $3`,
          [searchValue, limit, offset],
        )
      : await query(
          `SELECT id, subject_name, subject_code, description, is_active, created_at
           FROM subjects
           ORDER BY subject_name ASC
           LIMIT $1 OFFSET $2`,
          [limit, offset],
        );

    const subjects = dataResult.rows.map((row) => ({
      id: row.id,
      name: row.subject_name,
      code: row.subject_code,
      description: row.description,
      isActive: row.is_active,
      status: row.is_active ? "Active" : "Inactive",
      createdAt: row.created_at,
    }));

    sendPaginatedResponse(res, 200, subjects, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  },
);

export const createSubject = asyncHandler(
  async (req: Request, res: Response) => {
    await ensureSubjectStatusColumn();

    const { name, code, description, isActive = true } = req.body;

    if (!name || !code) {
      return sendError(res, 400, "Subject name and code are required");
    }

    const duplicate = await query(
      "SELECT id FROM subjects WHERE subject_code = $1",
      [code],
    );

    if (duplicate.rowCount && duplicate.rowCount > 0) {
      return sendError(res, 409, "Subject code already exists");
    }

    const result = await query(
      `INSERT INTO subjects (subject_name, subject_code, description, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING id, subject_name, subject_code, description, is_active, created_at, updated_at`,
      [name, code, description || null, Boolean(isActive)],
    );

    const subject = result.rows[0];

    sendResponse(res, 201, "Subject created successfully", {
      id: subject.id,
      name: subject.subject_name,
      code: subject.subject_code,
      description: subject.description,
      isActive: subject.is_active,
      status: subject.is_active ? "Active" : "Inactive",
      createdAt: subject.created_at,
      updatedAt: subject.updated_at,
    });
  },
);

export const updateSubject = asyncHandler(
  async (req: Request, res: Response) => {
    await ensureSubjectStatusColumn();

    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      updates.subject_name = name;
    }

    if (code !== undefined) {
      const duplicate = await query(
        "SELECT id FROM subjects WHERE subject_code = $1 AND id != $2",
        [code, id],
      );

      if (duplicate.rowCount && duplicate.rowCount > 0) {
        return sendError(res, 409, "Subject code already exists");
      }

      updates.subject_code = code;
    }

    if (description !== undefined) {
      updates.description = description || null;
    }

    if (isActive !== undefined) {
      updates.is_active = Boolean(isActive);
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, "No fields to update");
    }

    const fields = Object.keys(updates);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");
    const values = fields.map((field) => updates[field]);

    const result = await query(
      `UPDATE subjects
     SET ${setClause}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${fields.length + 1}
     RETURNING id, subject_name, subject_code, description, is_active, created_at, updated_at`,
      [...values, id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Subject not found");
    }

    const subject = result.rows[0];

    sendResponse(res, 200, "Subject updated successfully", {
      id: subject.id,
      name: subject.subject_name,
      code: subject.subject_code,
      description: subject.description,
      isActive: subject.is_active,
      status: subject.is_active ? "Active" : "Inactive",
      createdAt: subject.created_at,
      updatedAt: subject.updated_at,
    });
  },
);

export const getAllAllocations = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { classId, subjectId, teacherId } = req.query;
    const offset = (page - 1) * limit;

    const whereParts: string[] = [];
    const whereValues: string[] = [];

    if (typeof classId === "string" && classId) {
      whereValues.push(classId);
      whereParts.push(`cs.class_id = $${whereValues.length}`);
    }

    if (typeof subjectId === "string" && subjectId) {
      whereValues.push(subjectId);
      whereParts.push(`cs.subject_id = $${whereValues.length}`);
    }

    if (typeof teacherId === "string" && teacherId) {
      whereValues.push(teacherId);
      whereParts.push(`cs.teacher_id = $${whereValues.length}`);
    }

    const whereClause =
      whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*)
       FROM class_subjects cs
       ${whereClause}`,
      whereValues,
    );

    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT cs.id, cs.class_id, cs.subject_id, cs.teacher_id, cs.created_at,
              c.class_name, c.section_name, c.class_code,
              s.subject_name, s.subject_code,
              u.first_name, u.last_name, t.employee_id
       FROM class_subjects cs
       JOIN classes c ON cs.class_id = c.id
       JOIN subjects s ON cs.subject_id = s.id
       JOIN teachers t ON cs.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY cs.created_at DESC
       LIMIT $${whereValues.length + 1} OFFSET $${whereValues.length + 2}`,
      [...whereValues, limit, offset],
    );

    const allocations = result.rows.map((row) => ({
      id: row.id,
      classId: row.class_id,
      className: row.class_name,
      sectionName: row.section_name,
      classCode: row.class_code,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
      teacherId: row.teacher_id,
      teacherName: `${row.first_name} ${row.last_name}`,
      teacherEmployeeId: row.employee_id,
      allocatedAt: row.created_at,
    }));

    sendPaginatedResponse(res, 200, allocations, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  },
);

export const createAllocation = asyncHandler(
  async (req: Request, res: Response) => {
    const { classId, subjectId, teacherId } = req.body;

    if (!classId || !subjectId || !teacherId) {
      return sendError(res, 400, "Class, subject, and teacher are required");
    }

    const classResult = await query("SELECT id FROM classes WHERE id = $1", [
      classId,
    ]);
    if (classResult.rowCount === 0) {
      return sendError(res, 404, "Class not found");
    }

    const subjectResult = await query("SELECT id FROM subjects WHERE id = $1", [
      subjectId,
    ]);
    if (subjectResult.rowCount === 0) {
      return sendError(res, 404, "Subject not found");
    }

    const teacherResult = await query("SELECT id FROM teachers WHERE id = $1", [
      teacherId,
    ]);
    if (teacherResult.rowCount === 0) {
      return sendError(res, 404, "Teacher not found");
    }

    const existing = await query(
      "SELECT id FROM class_subjects WHERE class_id = $1 AND subject_id = $2",
      [classId, subjectId],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      return sendError(
        res,
        409,
        "This subject is already allocated to the selected class",
      );
    }

    const result = await query(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id)
       VALUES ($1, $2, $3)
       RETURNING id, class_id, subject_id, teacher_id, created_at`,
      [classId, subjectId, teacherId],
    );

    sendResponse(res, 201, "Subject allocated successfully", result.rows[0]);
  },
);

export const deleteAllocation = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      "DELETE FROM class_subjects WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "Allocation not found");
    }

    sendResponse(res, 200, "Allocation deleted successfully");
  },
);
