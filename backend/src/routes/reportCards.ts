import express from "express";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";
import {
  generateReportCards,
  getMyReportCard,
  getReportCardMeta,
  getStudentReportCard,
  getTabulationSheet,
} from "../controllers/academic/reportCardController.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/meta", getReportCardMeta);
router.post(
  "/generate",
  authorizeRole("admin", "teacher"),
  generateReportCards,
);
router.get(
  "/tabulation",
  authorizeRole("admin", "teacher"),
  getTabulationSheet,
);
router.get("/student/me", authorizeRole("student"), getMyReportCard);
router.get("/student/:studentId", getStudentReportCard);

export default router;
