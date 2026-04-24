import express from "express";
import {
  createExam,
  createExamSchedule,
  deleteExam,
  deleteExamSchedule,
  getExamMeta,
  getExams,
  getExamSchedules,
  updateExam,
  updateExamSchedule,
} from "../controllers/academic/examController.js";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/meta", authenticateToken, getExamMeta);
router.get("/", authenticateToken, getExams);
router.post(
  "/",
  authenticateToken,
  authorizeRole("admin", "teacher"),
  createExam,
);
router.put(
  "/:examId",
  authenticateToken,
  authorizeRole("admin", "teacher"),
  updateExam,
);
router.delete(
  "/:examId",
  authenticateToken,
  authorizeRole("admin", "teacher"),
  deleteExam,
);

router.get("/schedules", authenticateToken, getExamSchedules);
router.post(
  "/:examId/schedules",
  authenticateToken,
  authorizeRole("admin", "teacher"),
  createExamSchedule,
);
router.put(
  "/schedules/:scheduleId",
  authenticateToken,
  authorizeRole("admin", "teacher"),
  updateExamSchedule,
);
router.delete(
  "/schedules/:scheduleId",
  authenticateToken,
  authorizeRole("admin", "teacher"),
  deleteExamSchedule,
);

export default router;
