import { Request, Response } from "express";
import { query } from "../../config/database.js";
import {
  sendResponse,
  sendError,
  sendPaginatedResponse,
} from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

// Get all users
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const role = req.query.role as string;
  const offset = (page - 1) * limit;

  let countQuery = "SELECT COUNT(*) FROM users u";
  let selectQuery = `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, 
                       u.role_id, r.name as role_name, u.status, u.created_at
                       FROM users u
                       JOIN roles r ON u.role_id = r.id`;
  const params: any[] = [];

  if (role) {
    countQuery += " WHERE r.name = $1";
    selectQuery += " WHERE r.name = $1";
    params.push(role);
  }

  const total = await query(countQuery, role ? [role] : []);
  const totalCount = parseInt(total.rows[0].count);

  params.push(limit);
  params.push(offset);

  selectQuery += ` ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await query(selectQuery, params);

  sendPaginatedResponse(
    res,
    200,
    result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      roleId: row.role_id,
      roleName: row.role_name,
      status: row.status,
      createdAt: row.created_at,
    })),
    {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
  );
});

// Get user by ID
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, 
       u.role_id, r.name as role_name, u.status, u.created_at, u.updated_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
    [id],
  );

  if (result.rowCount === 0) {
    return sendError(res, 404, "User not found");
  }

  const user = result.rows[0];
  sendResponse(res, 200, "User retrieved successfully", {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    roleId: user.role_id,
    roleName: user.role_name,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  });
});

// Update user
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, phone, status } = req.body;

  const updates: any = {};
  if (firstName !== undefined) updates.first_name = firstName;
  if (lastName !== undefined) updates.last_name = lastName;
  if (phone !== undefined) updates.phone = phone;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return sendError(res, 400, "No fields to update");
  }

  const fields = Object.keys(updates);
  const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  const values = fields.map((field) => updates[field]);

  const result = await query(
    `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1}
       RETURNING id, email, first_name, last_name, phone, role_id, status`,
    [...values, id],
  );

  if (result.rowCount === 0) {
    return sendError(res, 404, "User not found");
  }

  sendResponse(res, 200, "User updated successfully", result.rows[0]);
});

// Change user status
export const changeUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "suspended"].includes(status)) {
      return sendError(res, 400, "Invalid status");
    }

    const result = await query(
      "UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status",
      [status, id],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "User not found");
    }

    sendResponse(res, 200, "User status updated successfully", result.rows[0]);
  },
);

// Get dashboard statistics
export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    const totalUsers = await query("SELECT COUNT(*) FROM users");
    const totalStudents = await query(
      "SELECT COUNT(*) FROM students WHERE status = $1",
      ["active"],
    );
    const totalTeachers = await query(
      "SELECT COUNT(*) FROM teachers WHERE status = $1",
      ["active"],
    );
    const totalClasses = await query("SELECT COUNT(*) FROM classes");

    // Attendance statistics for today
    const todayAttendance = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'present') as present_today,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_today,
        COUNT(*) FILTER (WHERE status = 'late') as late_today,
        COUNT(*) as total_today
       FROM attendance 
       WHERE attendance_date = CURRENT_DATE`,
    );

    // Attendance statistics for this week
    const weekAttendance = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'present') as present_week,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_week,
        COUNT(*) as total_week
       FROM attendance 
       WHERE attendance_date >= CURRENT_DATE - INTERVAL '7 days'`,
    );

    // Financial statistics
    const financialStats = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_invoices,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'pending'), 0) as total_pending,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as total_collected,
        COALESCE(SUM(total_amount), 0) as total_amount
       FROM invoices`,
    );

    // Active enrollments
    const activeEnrollments = await query(
      "SELECT COUNT(*) FROM student_enrollments WHERE status = 'active'",
    );

    const usersByRole = await query(
      `SELECT r.name, COUNT(u.id) as count 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       GROUP BY r.name`,
    );

    sendResponse(res, 200, "Dashboard statistics retrieved", {
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalStudents: parseInt(totalStudents.rows[0].count),
      totalTeachers: parseInt(totalTeachers.rows[0].count),
      totalClasses: parseInt(totalClasses.rows[0].count),
      activeEnrollments: parseInt(activeEnrollments.rows[0].count),
      attendance: {
        today: {
          present: parseInt(todayAttendance.rows[0]?.present_today || 0),
          absent: parseInt(todayAttendance.rows[0]?.absent_today || 0),
          late: parseInt(todayAttendance.rows[0]?.late_today || 0),
          total: parseInt(todayAttendance.rows[0]?.total_today || 0),
        },
        week: {
          present: parseInt(weekAttendance.rows[0]?.present_week || 0),
          absent: parseInt(weekAttendance.rows[0]?.absent_week || 0),
          total: parseInt(weekAttendance.rows[0]?.total_week || 0),
        },
      },
      finance: {
        pendingInvoices: parseInt(
          financialStats.rows[0]?.pending_invoices || 0,
        ),
        totalPending: parseFloat(financialStats.rows[0]?.total_pending || 0),
        totalCollected: parseFloat(
          financialStats.rows[0]?.total_collected || 0,
        ),
        totalAmount: parseFloat(financialStats.rows[0]?.total_amount || 0),
      },
      usersByRole: usersByRole.rows,
    });
  },
);
