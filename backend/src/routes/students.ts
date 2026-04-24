import express from "express";
import {
  getAllStudents,
  getMyStudentProfile,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentAttendance,
  getStudentMarks,
} from "../controllers/academic/studentController.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /academic/students:
 *   get:
 *     summary: Get all students (paginated)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Students retrieved
 */
router.get("/", authenticateToken, getAllStudents);

/**
 * @swagger
 * /academic/students/me:
 *   get:
 *     summary: Get current authenticated student's profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile retrieved
 */
router.get("/me", authenticateToken, getMyStudentProfile);

/**
 * @swagger
 * /academic/students/{id}:
 *   get:
 *     summary: Get student by ID
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student retrieved
 *       404:
 *         description: Student not found
 */
router.get("/:id", authenticateToken, getStudentById);

/**
 * @swagger
 * /academic/students:
 *   post:
 *     summary: Create new student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", authenticateToken, createStudent);

/**
 * @swagger
 * /academic/students/{id}:
 *   put:
 *     summary: Update student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", authenticateToken, authorizeRole("admin"), updateStudent);

/**
 * @swagger
 * /academic/students/{id}:
 *   delete:
 *     summary: Delete student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", authenticateToken, authorizeRole("admin"), deleteStudent);

/**
 * @swagger
 * /academic/students/{id}/attendance:
 *   get:
 *     summary: Get student attendance
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/attendance", authenticateToken, getStudentAttendance);

/**
 * @swagger
 * /academic/students/{id}/marks:
 *   get:
 *     summary: Get student marks
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/marks", authenticateToken, getStudentMarks);

export default router;
