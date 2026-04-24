import express from "express";
import {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassSubjects,
  getClassStudents,
  getAcademicYears,
  createAcademicYear,
} from "../controllers/academic/classController.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /academic/classes:
 *   get:
 *     summary: Get all classes (paginated)
 *     tags: [Classes]
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
 *         description: Classes retrieved
 */
router.get("/", authenticateToken, getAllClasses);

/**
 * @swagger
 * /academic/classes/data/academic-years:
 *   get:
 *     summary: Get all academic years
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Academic years retrieved
 */
router.get("/data/academic-years", authenticateToken, getAcademicYears);

/**
 * @swagger
 * /academic/classes/data/academic-years:
 *   post:
 *     summary: Create new academic year
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 */
router.post("/data/academic-years", authenticateToken, createAcademicYear);

/**
 * @swagger
 * /academic/classes/{id}:
 *   get:
 *     summary: Get class by ID
 *     tags: [Classes]
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
 *         description: Class retrieved
 *       404:
 *         description: Class not found
 */
router.get("/:id", authenticateToken, getClassById);

/**
 * @swagger
 * /academic/classes:
 *   post:
 *     summary: Create new class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", authenticateToken, createClass);

/**
 * @swagger
 * /academic/classes/{id}:
 *   put:
 *     summary: Update class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", authenticateToken, authorizeRole("admin"), updateClass);

/**
 * @swagger
 * /academic/classes/{id}:
 *   delete:
 *     summary: Delete class
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", authenticateToken, authorizeRole("admin"), deleteClass);

/**
 * @swagger
 * /academic/classes/{id}/subjects:
 *   get:
 *     summary: Get class subjects
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/subjects", authenticateToken, getClassSubjects);

/**
 * @swagger
 * /academic/classes/{id}/students:
 *   get:
 *     summary: Get class students
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/students", authenticateToken, getClassStudents);

export default router;
