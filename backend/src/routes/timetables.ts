import express from "express";
import {
  getTimetableClassOptions,
  getTimetableSubjects,
  getTimetableTeachers,
  getClassTimetable,
  saveClassTimetable,
  getMyTeacherTimetable,
  getMyStudentTimetable,
} from "../controllers/academic/timetableController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/meta/classes", authenticateToken, getTimetableClassOptions);
router.get("/meta/subjects", authenticateToken, getTimetableSubjects);
router.get("/meta/teachers", authenticateToken, getTimetableTeachers);

router.get("/class/:classId", authenticateToken, getClassTimetable);
router.put("/class/:classId", authenticateToken, saveClassTimetable);

router.get("/teacher/me", authenticateToken, getMyTeacherTimetable);
router.get("/student/me", authenticateToken, getMyStudentTimetable);

export default router;
