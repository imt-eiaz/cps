import express from "express";
import {
  markAttendance,
  bulkMarkAttendance,
  getClassAttendance,
  getClassAttendanceStats,
} from "../controllers/academic/attendanceController.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /academic/attendance:
 *   post:
 *     summary: Mark attendance for a single student
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", authenticateToken, markAttendance);

/**
 * @swagger
 * /academic/attendance/bulk:
 *   post:
 *     summary: Mark attendance for multiple students
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 */
router.post("/bulk", authenticateToken, bulkMarkAttendance);

/**
 * @swagger
 * /academic/attendance/class/{classId}:
 *   get:
 *     summary: Get attendance for a class on a specific date
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 */
router.get("/class/:classId", authenticateToken, getClassAttendance);

/**
 * @swagger
 * /academic/attendance/class/{classId}/stats:
 *   get:
 *     summary: Get attendance statistics for a class
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 */
router.get("/class/:classId/stats", authenticateToken, getClassAttendanceStats);

export default router;
