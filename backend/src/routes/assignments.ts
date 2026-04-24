import express from "express";
import { authenticateToken, authorizeRole } from "../middleware/auth.js";
import {
  createAssignment,
  deleteAssignment,
  getAssignmentById,
  getAssignmentGradingPanel,
  getAssignmentMeta,
  getStudentAssignmentDashboard,
  gradeAssignmentSubmission,
  listAssignments,
  submitAssignment,
  updateAssignment,
  updateAssignmentStatus,
} from "../controllers/academic/assignmentController.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/meta", getAssignmentMeta);
router.get("/", listAssignments);
router.post("/", authorizeRole("admin", "teacher"), createAssignment);
router.put(
  "/:assignmentId",
  authorizeRole("admin", "teacher"),
  updateAssignment,
);
router.patch(
  "/:assignmentId/status",
  authorizeRole("admin", "teacher"),
  updateAssignmentStatus,
);
router.delete(
  "/:assignmentId",
  authorizeRole("admin", "teacher"),
  deleteAssignment,
);
router.get("/student/dashboard", getStudentAssignmentDashboard);
router.get("/:assignmentId", getAssignmentById);
router.post(
  "/:assignmentId/submit",
  authorizeRole("student"),
  submitAssignment,
);
router.get(
  "/:assignmentId/grading",
  authorizeRole("admin", "teacher"),
  getAssignmentGradingPanel,
);
router.put(
  "/submissions/:submissionId/grade",
  authorizeRole("admin", "teacher"),
  gradeAssignmentSubmission,
);

export default router;
