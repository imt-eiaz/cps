import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  changeUserStatus,
  getDashboardStats,
} from "../controllers/admin/userController.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get("/users", authenticateToken, authorizeRole("admin"), getAllUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/users/:id",
  authenticateToken,
  authorizeRole("admin"),
  getUserById,
);

/**
 * @swagger
 * /admin/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.put("/users/:id", authenticateToken, authorizeRole("admin"), updateUser);

/**
 * @swagger
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Change user status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/users/:id/status",
  authenticateToken,
  authorizeRole("admin"),
  changeUserStatus,
);

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/dashboard",
  authenticateToken,
  authorizeRole("admin"),
  getDashboardStats,
);

export default router;
