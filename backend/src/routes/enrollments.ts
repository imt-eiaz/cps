import express from "express";
import {
  getAllEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollmentStatus,
  deleteEnrollment,
  getAvailableStudents,
  getEnrollmentStats,
} from "../controllers/academic/enrollmentController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /academic/enrollments:
 *   get:
 *     summary: Get all enrollments with filters
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", authenticateToken, getAllEnrollments);

/**
 * @swagger
 * /academic/enrollments/stats:
 *   get:
 *     summary: Get enrollment statistics
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 */
router.get("/stats", authenticateToken, getEnrollmentStats);

/**
 * @swagger
 * /academic/enrollments/available-students:
 *   get:
 *     summary: Get students available for enrollment in a class
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 */
router.get("/available-students", authenticateToken, getAvailableStudents);

/**
 * @swagger
 * /academic/enrollments/{id}:
 *   get:
 *     summary: Get enrollment by ID
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id", authenticateToken, getEnrollmentById);

/**
 * @swagger
 * /academic/enrollments:
 *   post:
 *     summary: Create new enrollment
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", authenticateToken, createEnrollment);

/**
 * @swagger
 * /academic/enrollments/{id}/status:
 *   patch:
 *     summary: Update enrollment status
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 */
router.patch("/:id/status", authenticateToken, updateEnrollmentStatus);

/**
 * @swagger
 * /academic/enrollments/{id}:
 *   delete:
 *     summary: Delete enrollment
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", authenticateToken, deleteEnrollment);

export default router;
