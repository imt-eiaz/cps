import { Request, Response } from "express";
import { query } from "../../config/database.js";
import { sendResponse, sendError } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

// Mark attendance for a single student
export const markAttendance = asyncHandler(
  async (req: Request, res: Response) => {
    const { studentId, classId, attendanceDate, status, remarks } = req.body;

    // Validate required fields
    if (!studentId || !classId || !attendanceDate || !status) {
      return sendError(res, 400, "Missing required fields");
    }

    // Validate status
    const validStatuses = ["present", "absent", "late", "leave"];
    if (!validStatuses.includes(status)) {
      return sendError(
        res,
        400,
        "Invalid status. Must be: present, absent, late, or leave",
      );
    }

    // Check if attendance already exists
    const existingAttendance = await query(
      `SELECT id FROM attendance 
       WHERE student_id = $1 AND class_id = $2 AND attendance_date = $3`,
      [studentId, classId, attendanceDate],
    );

    if (existingAttendance.rowCount && existingAttendance.rowCount > 0) {
      // Update existing attendance
      const result = await query(
        `UPDATE attendance 
         SET status = $1, remarks = $2, updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $3 AND class_id = $4 AND attendance_date = $5
         RETURNING *`,
        [status, remarks || null, studentId, classId, attendanceDate],
      );

      return sendResponse(res, 200, "Attendance updated successfully", {
        id: result.rows[0].id,
        studentId: result.rows[0].student_id,
        classId: result.rows[0].class_id,
        attendanceDate: result.rows[0].attendance_date,
        status: result.rows[0].status,
        remarks: result.rows[0].remarks,
      });
    }

    // Create new attendance record
    const result = await query(
      `INSERT INTO attendance (student_id, class_id, attendance_date, status, remarks)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [studentId, classId, attendanceDate, status, remarks || null],
    );

    sendResponse(res, 201, "Attendance marked successfully", {
      id: result.rows[0].id,
      studentId: result.rows[0].student_id,
      classId: result.rows[0].class_id,
      attendanceDate: result.rows[0].attendance_date,
      status: result.rows[0].status,
      remarks: result.rows[0].remarks,
    });
  },
);

// Bulk mark attendance for multiple students
export const bulkMarkAttendance = asyncHandler(
  async (req: Request, res: Response) => {
    const { classId, attendanceDate, attendanceRecords } = req.body;

    // Validate required fields
    if (!classId || !attendanceDate || !Array.isArray(attendanceRecords)) {
      return sendError(
        res,
        400,
        "Missing required fields. Need classId, attendanceDate, and attendanceRecords array",
      );
    }

    const validStatuses = ["present", "absent", "late", "leave"];
    const results = [];
    const errors = [];

    for (const record of attendanceRecords) {
      try {
        const { studentId, status, remarks } = record;

        if (!studentId || !status) {
          errors.push({
            studentId,
            error: "Missing studentId or status",
          });
          continue;
        }

        if (!validStatuses.includes(status)) {
          errors.push({
            studentId,
            error: "Invalid status",
          });
          continue;
        }

        // Check if attendance already exists
        const existingAttendance = await query(
          `SELECT id FROM attendance 
           WHERE student_id = $1 AND class_id = $2 AND attendance_date = $3`,
          [studentId, classId, attendanceDate],
        );

        if (existingAttendance.rowCount && existingAttendance.rowCount > 0) {
          // Update existing attendance
          await query(
            `UPDATE attendance 
             SET status = $1, remarks = $2, updated_at = CURRENT_TIMESTAMP
             WHERE student_id = $3 AND class_id = $4 AND attendance_date = $5`,
            [status, remarks || null, studentId, classId, attendanceDate],
          );
        } else {
          // Create new attendance record
          await query(
            `INSERT INTO attendance (student_id, class_id, attendance_date, status, remarks)
             VALUES ($1, $2, $3, $4, $5)`,
            [studentId, classId, attendanceDate, status, remarks || null],
          );
        }

        results.push({ studentId, status: "success" });
      } catch (error) {
        errors.push({
          studentId: record.studentId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    sendResponse(res, 200, "Bulk attendance marked", {
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  },
);

// Get attendance for a class on a specific date
export const getClassAttendance = asyncHandler(
  async (req: Request, res: Response) => {
    const { classId } = req.params;
    const { date } = req.query;

    if (!date) {
      return sendError(res, 400, "Date parameter is required");
    }

    // Get all students enrolled in the class
    const studentsResult = await query(
      `SELECT s.id, u.first_name, u.last_name, s.admission_number, u.email
       FROM student_enrollments se
       JOIN students s ON se.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE se.class_id = $1 AND se.status = 'active'
       ORDER BY u.first_name ASC`,
      [classId],
    );

    // Get attendance records for the date
    const attendanceResult = await query(
      `SELECT student_id, status, remarks
       FROM attendance
       WHERE class_id = $1 AND attendance_date = $2`,
      [classId, date],
    );

    // Create a map of attendance records
    const attendanceMap = new Map();
    attendanceResult.rows.forEach((row) => {
      attendanceMap.set(row.student_id, {
        status: row.status,
        remarks: row.remarks,
      });
    });

    // Combine student data with attendance data
    const students = studentsResult.rows.map((student) => {
      const attendance = attendanceMap.get(student.id);
      return {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        admissionNumber: student.admission_number,
        email: student.email,
        status: attendance?.status || null,
        remarks: attendance?.remarks || null,
      };
    });

    sendResponse(res, 200, "Class attendance retrieved successfully", {
      classId,
      date,
      students,
      statistics: {
        total: students.length,
        present: students.filter((s) => s.status === "present").length,
        absent: students.filter((s) => s.status === "absent").length,
        late: students.filter((s) => s.status === "late").length,
        leave: students.filter((s) => s.status === "leave").length,
        notMarked: students.filter((s) => !s.status).length,
      },
    });
  },
);

// Get attendance statistics for a class
export const getClassAttendanceStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    let dateFilter = "";
    const params: any[] = [classId];

    if (startDate) {
      dateFilter += " AND attendance_date >= $2";
      params.push(startDate);
    }

    if (endDate) {
      const endParamIndex = params.length + 1;
      dateFilter += ` AND attendance_date <= $${endParamIndex}`;
      params.push(endDate);
    }

    const result = await query(
      `SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
        COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave_count
       FROM attendance
       WHERE class_id = $1${dateFilter}`,
      params,
    );

    const stats = result.rows[0];

    sendResponse(res, 200, "Attendance statistics retrieved", {
      classId,
      startDate: startDate || null,
      endDate: endDate || null,
      totalRecords: parseInt(stats.total_records),
      present: parseInt(stats.present_count),
      absent: parseInt(stats.absent_count),
      late: parseInt(stats.late_count),
      leave: parseInt(stats.leave_count),
      attendancePercentage:
        stats.total_records > 0
          ? ((parseInt(stats.present_count) + parseInt(stats.late_count)) /
              parseInt(stats.total_records)) *
            100
          : 0,
    });
  },
);
