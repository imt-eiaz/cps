import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.js";
import {
  sendResponse,
  sendError,
  sendPaginatedResponse,
} from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import {
  createTenant,
  listTenants,
  getTenantById,
  updateTenantStatus,
  updateTenantSubscription,
  deleteTenant,
  getTenantUsage,
  getTenantSettings,
  updateTenantSettings,
} from "../../core/tenant/tenant.service.js";
import { query } from "../../config/database.js";

interface SuperAdminRequest extends AuthRequest {
  user?: {
    userId: string;
    email: string;
    roleId: string;
    roleName: string;
    isSuperAdmin: boolean;
  };
}

/**
 * Middleware to verify Super Admin access
 */
export const verifySuperAdmin = (
  req: SuperAdminRequest,
  res: Response,
  next: any,
) => {
  if (!req.user?.isSuperAdmin) {
    return sendError(res, 403, "Super Admin access required");
  }
  next();
};

/**
 * ========== TENANT MANAGEMENT ==========
 */

/**
 * create tenant - Platform admin creates a new school
 * POST /admin/tenants
 */
export const createNewTenant = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(
        res,
        403,
        "You do not have permission to create tenants",
      );
    }

    const { name, slug, subdomain, subscriptionTier, maxUsers, maxStudents } =
      req.body;

    if (!name || !slug || !subdomain) {
      return sendError(res, 400, "name, slug, and subdomain are required");
    }

    try {
      const tenant = await createTenant({
        name,
        slug,
        subdomain,
        subscriptionTier: subscriptionTier || "basic",
        maxUsers: maxUsers || 100,
        maxStudents: maxStudents || 1000,
      });

      sendResponse(res, 201, "Tenant created successfully", tenant);
    } catch (error: any) {
      if (error.message.includes("already taken")) {
        return sendError(res, 409, error.message);
      }
      console.error("Error creating tenant:", error);
      return sendError(res, 500, "Failed to create tenant");
    }
  },
);

/**
 * Get all tenants (with optional filtering)
 * GET /admin/tenants?status=active
 */
export const getAllTenants = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    const status = req.query.status as
      | "active"
      | "inactive"
      | "suspended"
      | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    try {
      const tenants = await listTenants(status);

      const total = tenants.length;
      const paginated = tenants.slice(offset, offset + limit);

      sendPaginatedResponse(res, 200, paginated, {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error("Error fetching tenants:", error);
      return sendError(res, 500, "Failed to fetch tenants");
    }
  },
);

/**
 * Get single tenant details
 * GET /admin/tenants/:tenantId
 */
export const getTenant = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    const { tenantId } = req.params;

    try {
      const tenant = await getTenantById(tenantId);

      if (!tenant) {
        return sendError(res, 404, "Tenant not found");
      }

      sendResponse(res, 200, "Tenant retrieved successfully", tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      return sendError(res, 500, "Failed to fetch tenant");
    }
  },
);

/**
 * Get tenant details including settings and subscription
 * GET /admin/tenants/:tenantId/details
 */
export const getTenantDetails = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    const { tenantId } = req.params;

    try {
      const [tenant, settings, subscription, usage] = await Promise.all([
        getTenantById(tenantId),
        getTenantSettings(tenantId),
        query("SELECT * FROM tenant_subscriptions WHERE tenant_id = $1", [
          tenantId,
        ]),
        getTenantUsage(tenantId),
      ]);

      if (!tenant) {
        return sendError(res, 404, "Tenant not found");
      }

      const subscriptionData = subscription.rows[0] || null;

      sendResponse(res, 200, "Tenant details retrieved", {
        tenant,
        settings,
        subscription: subscriptionData,
        usage,
      });
    } catch (error) {
      console.error("Error fetching tenant details:", error);
      return sendError(res, 500, "Failed to fetch tenant details");
    }
  },
);

/**
 * Update tenant settings (school info)
 * PATCH /admin/tenants/:tenantId/settings
 */
export const updateSettings = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    const { tenantId } = req.params;

    try {
      const tenant = await getTenantById(tenantId);
      if (!tenant) {
        return sendError(res, 404, "Tenant not found");
      }

      const settings = await updateTenantSettings(tenantId, req.body);

      sendResponse(res, 200, "Tenant settings updated successfully", settings);
    } catch (error) {
      console.error("Error updating tenant settings:", error);
      return sendError(res, 500, "Failed to update settings");
    }
  },
);

/**
 * Update tenant status (active/inactive/suspended)
 * PATCH /admin/tenants/:tenantId/status
 */
export const updateTenantStatusEndpoint = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    const { tenantId } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "suspended"].includes(status)) {
      return sendError(res, 400, "Invalid status");
    }

    try {
      const updated = await updateTenantStatus(tenantId, status);

      if (!updated) {
        return sendError(res, 404, "Tenant not found");
      }

      sendResponse(res, 200, "Tenant status updated", updated);
    } catch (error) {
      console.error("Error updating status:", error);
      return sendError(res, 500, "Failed to update status");
    }
  },
);

/**
 * Update subscription tier and limits
 * PATCH /admin/tenants/:tenantId/subscription
 */
export const updateSubscriptionTier = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    const { tenantId } = req.params;
    const { tier, maxUsers, maxStudents } = req.body;

    if (!["basic", "pro", "enterprise"].includes(tier)) {
      return sendError(res, 400, "Invalid subscription tier");
    }

    if (!maxUsers || !maxStudents) {
      return sendError(res, 400, "maxUsers and maxStudents are required");
    }

    try {
      const updated = await updateTenantSubscription(tenantId, tier, {
        maxUsers,
        maxStudents,
      });

      if (!updated) {
        return sendError(res, 404, "Tenant not found");
      }

      sendResponse(res, 200, "Subscription updated", updated);
    } catch (error) {
      console.error("Error updating subscription:", error);
      return sendError(res, 500, "Failed to update subscription");
    }
  },
);

/**
 * Delete tenant (soft delete)
 * DELETE /admin/tenants/:tenantId
 */
export const deleteTenantEndpoint = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    const { tenantId } = req.params;

    try {
      const deleted = await deleteTenant(tenantId);

      if (!deleted) {
        return sendError(res, 404, "Tenant not found");
      }

      sendResponse(res, 200, "Tenant deleted successfully");
    } catch (error) {
      console.error("Error deleting tenant:", error);
      return sendError(res, 500, "Failed to delete tenant");
    }
  },
);

/**
 * ========== ANALYTICS & MONITORING ==========
 */

/**
 * Get platform-wide statistics
 * GET /admin/analytics/platform
 */
export const getPlatformStats = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    try {
      const [tenantCount, userCount, studentCount, activeSubscriptions] =
        await Promise.all([
          query("SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL"),
          query("SELECT COUNT(*) FROM users"),
          query("SELECT COUNT(*) FROM students"),
          query(
            "SELECT COUNT(*) FROM tenant_subscriptions WHERE status = 'active'",
          ),
        ]);

      sendResponse(res, 200, "Platform statistics", {
        totalTenants: parseInt(tenantCount.rows[0].count),
        totalUsers: parseInt(userCount.rows[0].count),
        totalStudents: parseInt(studentCount.rows[0].count),
        activeSubscriptions: parseInt(activeSubscriptions.rows[0].count),
      });
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      return sendError(res, 500, "Failed to fetch statistics");
    }
  },
);

/**
 * Get tenant-specific analytics
 * GET /admin/tenants/:tenantId/analytics
 */
export const getTenantAnalytics = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    const { tenantId } = req.params;

    try {
      const [usage, activityStats] = await Promise.all([
        getTenantUsage(tenantId),
        query(
          `SELECT
            COUNT(DISTINCT u.id) as total_users,
            COUNT(DISTINCT s.id) as total_students,
            COUNT(DISTINCT t.id) as total_teachers,
            COUNT(DISTINCT c.id) as total_classes
          FROM tenants tn
          LEFT JOIN users u ON tn.id = u.tenant_id
          LEFT JOIN students s ON tn.id = s.tenant_id
          LEFT JOIN teachers t ON tn.id = t.tenant_id
          LEFT JOIN classes c ON tn.id = c.tenant_id
          WHERE tn.id = $1`,
          [tenantId],
        ),
      ]);

      const stats = activityStats.rows[0];

      sendResponse(res, 200, "Tenant analytics", {
        ...usage,
        breakdown: {
          totalUsers: parseInt(stats.total_users),
          totalStudents: parseInt(stats.total_students),
          totalTeachers: parseInt(stats.total_teachers),
          totalClasses: parseInt(stats.total_classes),
        },
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      return sendError(res, 500, "Failed to fetch analytics");
    }
  },
);

/**
 * ========== SUPER ADMIN MANAGEMENT ==========
 */

/**
 * Create a super admin user (from existing user)
 * POST /admin/super-admins
 *
 * Body: { userId: string }
 */
export const createSuperAdmin = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    const { userId } = req.body;

    if (!userId) {
      return sendError(res, 400, "userId is required");
    }

    try {
      // Verify user exists
      const userCheck = await query("SELECT * FROM users WHERE id = $1", [
        userId,
      ]);
      if (userCheck.rowCount === 0) {
        return sendError(res, 404, "User not found");
      }

      // Update user as super admin
      await query(
        "UPDATE users SET is_super_admin = TRUE, tenant_id = NULL WHERE id = $1",
        [userId],
      );

      // Create super_admin record
      const result = await query(
        `INSERT INTO super_admins (user_id)
         VALUES ($1)
         RETURNING id, user_id, created_at`,
        [userId],
      );

      sendResponse(res, 201, "Super admin created", result.rows[0]);
    } catch (error) {
      console.error("Error creating super admin:", error);
      return sendError(res, 500, "Failed to create super admin");
    }
  },
);

/**
 * List all super admins
 * GET /admin/super-admins
 */
export const listSuperAdmins = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    try {
      const result = await query(
        `SELECT u.id, u.email, u.first_name, u.last_name, 
                u.created_at, sa.created_at as super_admin_since
         FROM users u
         JOIN super_admins sa ON u.id = sa.user_id
         WHERE sa.revoked_at IS NULL
         ORDER BY sa.created_at DESC`,
      );

      sendResponse(res, 200, "Super admins list", result.rows);
    } catch (error) {
      console.error("Error fetching super admins:", error);
      return sendError(res, 500, "Failed to fetch super admins");
    }
  },
);

/**
 * Revoke super admin access
 * DELETE /admin/super-admins/:userId
 */
export const revokeSuperAdmin = asyncHandler(
  async (req: SuperAdminRequest, res: Response) => {
    if (!req.user?.isSuperAdmin) {
      return sendError(res, 403, "Super Admin access required");
    }

    if (req.user.userId === req.params.userId) {
      return sendError(res, 400, "Cannot revoke your own admin access");
    }

    const { userId } = req.params;

    try {
      // Revoke super admin
      await query(
        `UPDATE super_admins SET revoked_at = CURRENT_TIMESTAMP, revoked_by = $1
         WHERE user_id = $2 AND revoked_at IS NULL`,
        [req.user.userId, userId],
      );

      // Update user
      await query("UPDATE users SET is_super_admin = FALSE WHERE id = $1", [
        userId,
      ]);

      sendResponse(res, 200, "Super admin access revoked");
    } catch (error) {
      console.error("Error revoking super admin:", error);
      return sendError(res, 500, "Failed to revoke access");
    }
  },
);
