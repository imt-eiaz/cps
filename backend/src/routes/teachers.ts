import express from "express";
import {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherClasses,
  getTeacherSubjects,
  changeTeacherStatus,
} from "../controllers/academic/teacherController.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /academic/teachers:
 *   get:
 *     summary: Get all teachers (paginated)
 *     tags: [Teachers]
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
 *         description: Teachers retrieved
 */
router.get("/", authenticateToken, getAllTeachers);

/**
 * @swagger
 * /academic/teachers/{id}:
 *   get:
 *     summary: Get teacher by ID
 *     tags: [Teachers]
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
 *         description: Teacher retrieved
 *       404:
 *         description: Teacher not found
 */
router.get("/:id", authenticateToken, getTeacherById);

/**
 * @swagger
 * /academic/teachers:
 *   post:
 *     summary: Create new teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", authenticateToken, createTeacher);

/**
 * @swagger
 * /academic/teachers/{id}:
 *   put:
 *     summary: Update teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", authenticateToken, authorizeRole("admin"), updateTeacher);

/**
 * @swagger
 * /academic/teachers/{id}:
 *   delete:
 *     summary: Delete teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", authenticateToken, authorizeRole("admin"), deleteTeacher);

/**
 * @swagger
 * /academic/teachers/{id}/classes:
 *   get:
 *     summary: Get teacher's classes
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/classes", authenticateToken, getTeacherClasses);

/**
 * @swagger
 * /academic/teachers/{id}/subjects:
 *   get:
 *     summary: Get teacher's subjects
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/subjects", authenticateToken, getTeacherSubjects);

/**
 * @swagger
 * /academic/teachers/{id}/status:
 *   put:
 *     summary: Change teacher status
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id/status",
  authenticateToken,
  authorizeRole("admin"),
  changeTeacherStatus,
);

export default router;
