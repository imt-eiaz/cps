import express from "express";
import {
  getAllSubjects,
  createSubject,
  updateSubject,
  getAllAllocations,
  createAllocation,
  deleteAllocation,
} from "../controllers/academic/subjectController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, getAllSubjects);
router.post("/", authenticateToken, createSubject);
router.put("/:id", authenticateToken, updateSubject);

router.get("/allocations", authenticateToken, getAllAllocations);
router.post("/allocations", authenticateToken, createAllocation);
router.delete("/allocations/:id", authenticateToken, deleteAllocation);

export default router;
