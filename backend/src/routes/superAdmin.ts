import express, { Router } from "express";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";
import {
  createNewTenant,
  getAllTenants,
  getTenant,
  getTenantDetails,
  updateSettings,
  updateTenantStatusEndpoint,
  updateSubscriptionTier,
  deleteTenantEndpoint,
  getPlatformStats,
  getTenantAnalytics,
  createSuperAdmin,
  listSuperAdmins,
  revokeSuperAdmin,
  verifySuperAdmin,
} from "../controllers/admin/superAdminController.js";

const router: Router = express.Router();

// ==================== TENANT MANAGEMENT ====================

/**
 * @swagger
 * /admin/tenants:
 *   post:
 *     summary: Create a new tenant (Super Admin only)
 *     tags: [SuperAdmin - Tenants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               subdomain:
 *                 type: string
 *               subscriptionTier:
 *                 type: string
 *                 enum: [basic, pro, enterprise]
 *               maxUsers:
 *                 type: number
 *               maxStudents:
 *                 type: number
 */
router.post("/tenants", authenticateToken, verifySuperAdmin, createNewTenant);

/**
 * @swagger
 * /admin/tenants:
 *   get:
 *     summary: Get all tenants (Super Admin only)
 */
router.get("/tenants", authenticateToken, verifySuperAdmin, getAllTenants);

/**
 * @swagger
 * /admin/tenants/{tenantId}:
 *   get:
 *     summary: Get tenant details
 */
router.get(
  "/tenants/:tenantId",
  authenticateToken,
  verifySuperAdmin,
  getTenant,
);

/**
 * @swagger
 * /admin/tenants/{tenantId}/details:
 *   get:
 *     summary: Get tenant full details including settings and subscription
 */
router.get(
  "/tenants/:tenantId/details",
  authenticateToken,
  verifySuperAdmin,
  getTenantDetails,
);

/**
 * @swagger
 * /admin/tenants/{tenantId}/settings:
 *   patch:
 *     summary: Update tenant settings
 */
router.patch(
  "/tenants/:tenantId/settings",
  authenticateToken,
  verifySuperAdmin,
  updateSettings,
);

/**
 * @swagger
 * /admin/tenants/{tenantId}/status:
 *   patch:
 *     summary: Update tenant status
 */
router.patch(
  "/tenants/:tenantId/status",
  authenticateToken,
  verifySuperAdmin,
  updateTenantStatusEndpoint,
);

/**
 * @swagger
 * /admin/tenants/{tenantId}/subscription:
 *   patch:
 *     summary: Update tenant subscription tier
 */
router.patch(
  "/tenants/:tenantId/subscription",
  authenticateToken,
  verifySuperAdmin,
  updateSubscriptionTier,
);

/**
 * @swagger
 * /admin/tenants/{tenantId}:
 *   delete:
 *     summary: Delete tenant
 */
router.delete(
  "/tenants/:tenantId",
  authenticateToken,
  verifySuperAdmin,
  deleteTenantEndpoint,
);

// ==================== ANALYTICS ====================

/**
 * @swagger
 * /admin/analytics/platform:
 *   get:
 *     summary: Get platform-wide statistics
 */
router.get(
  "/analytics/platform",
  authenticateToken,
  verifySuperAdmin,
  getPlatformStats,
);

/**
 * @swagger
 * /admin/tenants/{tenantId}/analytics:
 *   get:
 *     summary: Get tenant-specific analytics
 */
router.get(
  "/tenants/:tenantId/analytics",
  authenticateToken,
  verifySuperAdmin,
  getTenantAnalytics,
);

// ==================== SUPER ADMIN MANAGEMENT ====================

/**
 * @swagger
 * /admin/super-admins:
 *   post:
 *     summary: Create a new super admin (Super Admin only)
 *     tags: [SuperAdmin - Management]
 */
router.post(
  "/super-admins",
  authenticateToken,
  verifySuperAdmin,
  createSuperAdmin,
);

/**
 * @swagger
 * /admin/super-admins:
 *   get:
 *     summary: List all super admins
 */
router.get(
  "/super-admins",
  authenticateToken,
  verifySuperAdmin,
  listSuperAdmins,
);

/**
 * @swagger
 * /admin/super-admins/{userId}:
 *   delete:
 *     summary: Revoke super admin access
 */
router.delete(
  "/super-admins/:userId",
  authenticateToken,
  verifySuperAdmin,
  revokeSuperAdmin,
);

export default router;
