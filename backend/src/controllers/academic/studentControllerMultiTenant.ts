import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.js";
import { TenantRequest } from "../../core/tenant/tenant.middleware.js";
import { StudentRepository } from "../../core/repository/BaseRepository.js";
import {
  sendResponse,
  sendError,
  sendPaginatedResponse,
} from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { query } from "../../config/database.js";

interface TenantAuthRequest extends AuthRequest, TenantRequest {
  user?: {
    userId: string;
    email: string;
    roleId: string;
    roleName: string;
    tenantId: string;
  };
}

/**
 * MULTI-TENANT STUDENT CONTROLLER
 *
 * All queries are automatically scoped to the tenant via:
 * 1. TenantRequest middleware that injects req.tenantId
 * 2. StudentRepository that filters all queries by tenant_id
 *
 * This ensures complete data isolation without repetitive WHERE clauses
 */

/**
 * Get all students in the current tenant
 * Automatically filtered by tenant_id via StudentRepository
 */
export const getAllStudents = asyncHandler(
  async (req: TenantAuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!req.tenantId) {
      return sendError(res, 400, "Tenant context required");
    }

    try {
      // Instantiate repository with tenant context
      const studentRepo = new StudentRepository(req.tenantId);

      // All queries are automatically scoped to tenant
      const result = await studentRepo.paginate(page, limit);

      // Fetch role names for authorization checks
      const userRole = req.user?.roleName;

      sendPaginatedResponse(
        res,
        200,
        result.data.map((student) => ({
          id: student.id,
          userId: student.userId,
          admissionNumber: student.admissionNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          status: student.status,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
        })),
        {
          page: result.page,
          limit: result.pageSize,
          total: result.total,
          pages: result.pages,
        },
      );
    } catch (error) {
      console.error("Error fetching students:", error);
      return sendError(res, 500, "Failed to fetch students");
    }
  },
);

/**
 * Get student by ID (with tenant check)
 * StudentRepository ensures tenant isolation
 */
export const getStudentById = asyncHandler(
  async (req: TenantAuthRequest, res: Response) => {
    const { id } = req.params;

    if (!req.tenantId) {
      return sendError(res, 400, "Tenant context required");
    }

    try {
      const studentRepo = new StudentRepository(req.tenantId);

      // This will return null if student doesn't belong to this tenant
      const student = await studentRepo.findById(id);

      if (!student) {
        return sendError(res, 404, "Student not found");
      }

      sendResponse(res, 200, "Student retrieved successfully", {
        id: student.id,
        userId: student.userId,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        admissionDate: student.admissionDate,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        status: student.status,
      });
    } catch (error) {
      console.error("Error fetching student:", error);
      return sendError(res, 500, "Failed to fetch student");
    }
  },
);

/**
 * Get current authenticated student's profile
 */
export const getMyStudentProfile = asyncHandler(
  async (req: TenantAuthRequest, res: Response) => {
    if (!req.user?.userId || !req.tenantId) {
      return sendError(res, 401, "Not authenticated");
    }

    try {
      // Query with tenant_id filter
      const result = await query(
        `SELECT s.id, s.user_id, u.email, u.first_name, u.last_name,
                s.admission_number, s.status, s.date_of_birth, s.gender
         FROM students s
         JOIN users u ON s.user_id = u.id
         WHERE s.user_id = $1 AND s.tenant_id = $2`,
        [req.user.userId, req.tenantId],
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
        dateOfBirth: row.date_of_birth,
        gender: row.gender,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return sendError(res, 500, "Failed to fetch profile");
    }
  },
);

/**
 * Create new student (admin/teacher only)
 * Automatically associates with tenant
 */
export const createStudent = asyncHandler(
  async (req: TenantAuthRequest, res: Response) => {
    if (!req.tenantId) {
      return sendError(res, 400, "Tenant context required");
    }

    if (req.user?.roleName !== "admin" && req.user?.roleName !== "teacher") {
      return sendError(
        res,
        403,
        "Only admins and teachers can create students",
      );
    }

    const {
      userId,
      admissionNumber,
      admissionDate,
      dateOfBirth,
      gender,
      fatherName,
      motherName,
    } = req.body;

    if (!userId || !admissionNumber || !admissionDate || !dateOfBirth) {
      return sendError(res, 400, "Missing required fields");
    }

    try {
      const studentRepo = new StudentRepository(req.tenantId);

      // Check for duplicate admission number in tenant
      const existing = await studentRepo.findOne({
        admission_number: admissionNumber,
      });

      if (existing) {
        return sendError(
          res,
          409,
          "Admission number already exists in this school",
        );
      }

      // Create student with tenant_id
      const student = await studentRepo.create({
        userId,
        admissionNumber,
        admissionDate,
        dateOfBirth,
        gender: gender || "Not specified",
        fatherName: fatherName || null,
        motherName: motherName || null,
        status: "active",
      });

      sendResponse(res, 201, "Student created successfully", student);
    } catch (error) {
      console.error("Error creating student:", error);
      return sendError(res, 500, "Failed to create student");
    }
  },
);

/**
 * Update student (admin/teacher only)
 * Tenant isolation enforced at repository level
 */
export const updateStudent = asyncHandler(
  async (req: TenantAuthRequest, res: Response) => {
    const { id } = req.params;

    if (!req.tenantId) {
      return sendError(res, 400, "Tenant context required");
    }

    if (req.user?.roleName !== "admin" && req.user?.roleName !== "teacher") {
      return sendError(
        res,
        403,
        "Only admins and teachers can update students",
      );
    }

    try {
      const studentRepo = new StudentRepository(req.tenantId);

      // Verify student exists and belongs to tenant
      const existing = await studentRepo.findById(id);
      if (!existing) {
        return sendError(res, 404, "Student not found");
      }

      // Update only allowed fields
      const updateData: any = {};
      if (req.body.gender !== undefined) updateData.gender = req.body.gender;
      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.fatherName !== undefined)
        updateData.fatherName = req.body.fatherName;
      if (req.body.motherName !== undefined)
        updateData.motherName = req.body.motherName;

      const updated = await studentRepo.update(id, updateData);

      sendResponse(res, 200, "Student updated successfully", updated);
    } catch (error) {
      console.error("Error updating student:", error);
      return sendError(res, 500, "Failed to update student");
    }
  },
);

/**
 * Delete student (soft delete)
 */
export const deleteStudent = asyncHandler(
  async (req: TenantAuthRequest, res: Response) => {
    const { id } = req.params;

    if (!req.tenantId) {
      return sendError(res, 400, "Tenant context required");
    }

    if (req.user?.roleName !== "admin") {
      return sendError(res, 403, "Only admins can delete students");
    }

    try {
      const studentRepo = new StudentRepository(req.tenantId);

      // Verify exists and belongs to tenant
      const existing = await studentRepo.findById(id);
      if (!existing) {
        return sendError(res, 404, "Student not found");
      }

      // Soft delete
      const deleted = await studentRepo.delete(id, true);

      if (!deleted) {
        return sendError(res, 500, "Failed to delete student");
      }

      sendResponse(res, 200, "Student deleted successfully");
    } catch (error) {
      console.error("Error deleting student:", error);
      return sendError(res, 500, "Failed to delete student");
    }
  },
);

/**
 * Get students by class
 * Example of filtered query within tenant
 */
export const getStudentsByClass = asyncHandler(
  async (req: TenantAuthRequest, res: Response) => {
    const { classId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!req.tenantId) {
      return sendError(res, 400, "Tenant context required");
    }

    try {
      const studentRepo = new StudentRepository(req.tenantId);

      // Get students in specific class within tenant
      const result = await studentRepo.paginate(page, limit, {
        class_id: classId,
        status: "active",
      });

      sendPaginatedResponse(res, 200, result.data, {
        page: result.page,
        limit: result.pageSize,
        total: result.total,
        pages: result.pages,
      });
    } catch (error) {
      console.error("Error fetching class students:", error);
      return sendError(res, 500, "Failed to fetch students");
    }
  },
);

/**
 * Statistics endpoint - only admin can access
 */
export const getStudentStats = asyncHandler(
  async (req: TenantAuthRequest, res: Response) => {
    if (req.user?.roleName !== "admin") {
      return sendError(res, 403, "Only admins can view statistics");
    }

    if (!req.tenantId) {
      return sendError(res, 400, "Tenant context required");
    }

    try {
      const studentRepo = new StudentRepository(req.tenantId);

      const [total, active, inactive] = await Promise.all([
        studentRepo.count(),
        studentRepo.count({ status: "active" }),
        studentRepo.count({ status: "inactive" }),
      ]);

      sendResponse(res, 200, "Student statistics retrieved", {
        total,
        active,
        inactive,
        graduated: await studentRepo.count({ status: "graduated" }),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      return sendError(res, 500, "Failed to fetch statistics");
    }
  },
);
