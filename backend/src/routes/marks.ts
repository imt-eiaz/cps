import express from "express";
import {
  uploadMarksBulk,
  updateStudentMarks,
  getStudentResultByExam,
  getStudentAllResults,
  getClassResultSheet,
  toggleExamPublishStatus,
} from "../controllers/academic/marksController.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /marks/bulk:
 *   post:
 *     summary: Upload marks in bulk for a class/subject/exam
 *     tags: [Marks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               examId:
 *                 type: string
 *               classId:
 *                 type: string
 *               subjectId:
 *                 type: string
 *               marks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     studentId:
 *                       type: string
 *                     marksObtained:
 *                       type: number
 *                     isAbsent:
 *                       type: boolean
 *                     graceMarks:
 *                       type: number
 *                     remarks:
 *                       type: string
 *     responses:
 *       201:
 *         description: Marks uploaded successfully
 */
router.post(
  "/bulk",
  authenticateToken,
  authorizeRole("admin", "teacher"),
  uploadMarksBulk,
);

/**
 * @swagger
 * /marks/{id}:
 *   put:
 *     summary: Update individual student marks
 *     tags: [Marks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               marksObtained:
 *                 type: number
 *               graceMarks:
 *                 type: number
 *               isAbsent:
 *                 type: boolean
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Marks updated successfully
 */
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("admin", "teacher"),
  updateStudentMarks,
);

/**
 * @swagger
 * /marks/student/{studentId}/exam/{examId}:
 *   get:
 *     summary: Get student result for a specific exam
 *     tags: [Marks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student result retrieved successfully
 */
router.get(
  "/student/:studentId/exam/:examId",
  authenticateToken,
  getStudentResultByExam,
);

/**
 * @swagger
 * /marks/student/{studentId}:
 *   get:
 *     summary: Get all results for a student (across all exams)
 *     tags: [Marks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student results retrieved successfully
 */
router.get("/student/:studentId", authenticateToken, getStudentAllResults);

/**
 * @swagger
 * /marks/class/{classId}/exam/{examId}:
 *   get:
 *     summary: Get class result sheet for an exam
 *     tags: [Marks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Class result sheet retrieved successfully
 */
router.get(
  "/class/:classId/exam/:examId",
  authenticateToken,
  authorizeRole("admin", "teacher"),
  getClassResultSheet,
);

/**
 * @swagger
 * /marks/exam/{examId}/publish:
 *   patch:
 *     summary: Publish or unpublish exam results
 *     tags: [Marks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Results published/unpublished successfully
 */
router.patch(
  "/exam/:examId/publish",
  authenticateToken,
  authorizeRole("admin"),
  toggleExamPublishStatus,
);

export default router;
