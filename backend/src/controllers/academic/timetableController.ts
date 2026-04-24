import { Response } from "express";
import { query } from "../../config/database.js";
import { sendResponse, sendError } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { AuthRequest } from "../../middleware/auth.js";

const weekOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const sortByDayAndTime = <T extends { dayOfWeek: string; startTime: string }>(
  rows: T[],
) => {
  return rows.sort((a, b) => {
    const dayDiff =
      weekOrder.indexOf(a.dayOfWeek) - weekOrder.indexOf(b.dayOfWeek);
    if (dayDiff !== 0) {
      return dayDiff;
    }

    return a.startTime.localeCompare(b.startTime);
  });
};

export const getTimetableClassOptions = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await query(
      `SELECT c.id, c.class_name, c.section_name, c.class_code, c.academic_year_id,
              ay.year_name
       FROM classes c
       LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
       ORDER BY c.class_name ASC, c.section_name ASC`,
    );

    const classes = result.rows.map((row) => ({
      id: row.id,
      className: row.class_name,
      sectionName: row.section_name,
      classCode: row.class_code,
      academicYearId: row.academic_year_id,
      academicYearName: row.year_name,
    }));

    sendResponse(res, 200, "Class options retrieved successfully", classes);
  },
);

export const getTimetableSubjects = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const result = await query(
      `SELECT id, subject_name, subject_code
       FROM subjects
       ORDER BY subject_name ASC`,
    );

    const subjects = result.rows.map((row) => ({
      id: row.id,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
    }));

    sendResponse(res, 200, "Subjects retrieved successfully", subjects);
  },
);

export const getTimetableTeachers = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const subjectId = (req.query.subjectId as string) || "";
    const classId = (req.query.classId as string) || "";

    let whereClause = "WHERE t.status = 'active'";
    const params: string[] = [];

    if (subjectId) {
      params.push(subjectId);
      whereClause += ` AND t.id IN (SELECT cs.teacher_id FROM class_subjects cs WHERE cs.subject_id = $${params.length})`;
    }

    if (classId) {
      params.push(classId);
      whereClause += ` AND t.id IN (SELECT cs.teacher_id FROM class_subjects cs WHERE cs.class_id = $${params.length})`;
    }

    const result = await query(
      `SELECT DISTINCT t.id, t.employee_id, u.first_name, u.last_name
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY u.first_name ASC, u.last_name ASC`,
      params,
    );

    const teachers = result.rows.map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
    }));

    sendResponse(res, 200, "Teachers retrieved successfully", teachers);
  },
);

export const getClassTimetable = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { classId } = req.params;

    const classInfo = await query(
      `SELECT c.id, c.class_name, c.section_name, c.class_code, c.academic_year_id, ay.year_name
       FROM classes c
       LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
       WHERE c.id = $1`,
      [classId],
    );

    if (classInfo.rowCount === 0) {
      return sendError(res, 404, "Class not found");
    }

    const scheduleResult = await query(
      `SELECT t.id, t.day_of_week, t.start_time, t.end_time, t.room_number,
              s.id as subject_id, s.subject_name, s.subject_code,
              tr.id as teacher_id, tr.employee_id, u.first_name, u.last_name
       FROM timetables t
       JOIN subjects s ON t.subject_id = s.id
       JOIN teachers tr ON t.teacher_id = tr.id
       JOIN users u ON tr.user_id = u.id
       WHERE t.class_id = $1
       ORDER BY CASE t.day_of_week
         WHEN 'Monday' THEN 1
         WHEN 'Tuesday' THEN 2
         WHEN 'Wednesday' THEN 3
         WHEN 'Thursday' THEN 4
         WHEN 'Friday' THEN 5
         WHEN 'Saturday' THEN 6
         WHEN 'Sunday' THEN 7
         ELSE 8 END,
       t.start_time ASC`,
      [classId],
    );

    const periods = scheduleResult.rows.map((row) => ({
      id: row.id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      roomNumber: row.room_number,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
      teacherId: row.teacher_id,
      teacherName: `${row.first_name} ${row.last_name}`,
      teacherEmployeeId: row.employee_id,
    }));

    const classRow = classInfo.rows[0];

    sendResponse(res, 200, "Class timetable retrieved successfully", {
      class: {
        id: classRow.id,
        className: classRow.class_name,
        sectionName: classRow.section_name,
        classCode: classRow.class_code,
        academicYearId: classRow.academic_year_id,
        academicYearName: classRow.year_name,
      },
      periods,
    });
  },
);

export const saveClassTimetable = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { classId } = req.params;
    const { periods } = req.body;

    if (!Array.isArray(periods)) {
      return sendError(res, 400, "Periods must be an array");
    }

    const classResult = await query(
      "SELECT id, academic_year_id FROM classes WHERE id = $1",
      [classId],
    );

    if (classResult.rowCount === 0) {
      return sendError(res, 404, "Class not found");
    }

    const academicYearId = classResult.rows[0].academic_year_id;

    await query("DELETE FROM timetables WHERE class_id = $1", [classId]);

    for (const period of periods) {
      const {
        dayOfWeek,
        startTime,
        endTime,
        subjectId,
        teacherId,
        roomNumber,
      } = period;

      if (!dayOfWeek || !startTime || !endTime || !subjectId || !teacherId) {
        return sendError(
          res,
          400,
          "Each period requires day, time, subject, and teacher",
        );
      }

      await query(
        `INSERT INTO timetables (
          class_id,
          academic_year_id,
          day_of_week,
          start_time,
          end_time,
          subject_id,
          teacher_id,
          room_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          classId,
          academicYearId,
          dayOfWeek,
          startTime,
          endTime,
          subjectId,
          teacherId,
          roomNumber || null,
        ],
      );
    }

    sendResponse(res, 200, "Timetable saved successfully");
  },
);

export const getMyTeacherTimetable = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const teacherResult = await query(
      "SELECT id FROM teachers WHERE user_id = $1",
      [req.user.userId],
    );

    if (teacherResult.rowCount === 0) {
      return sendError(res, 404, "Teacher profile not found for this user");
    }

    const teacherId = teacherResult.rows[0].id;

    const scheduleResult = await query(
      `SELECT t.id, t.day_of_week, t.start_time, t.end_time, t.room_number,
              c.id as class_id, c.class_name, c.section_name, c.class_code,
              s.id as subject_id, s.subject_name, s.subject_code
       FROM timetables t
       JOIN classes c ON t.class_id = c.id
       JOIN subjects s ON t.subject_id = s.id
       WHERE t.teacher_id = $1
       ORDER BY CASE t.day_of_week
         WHEN 'Monday' THEN 1
         WHEN 'Tuesday' THEN 2
         WHEN 'Wednesday' THEN 3
         WHEN 'Thursday' THEN 4
         WHEN 'Friday' THEN 5
         WHEN 'Saturday' THEN 6
         WHEN 'Sunday' THEN 7
         ELSE 8 END,
       t.start_time ASC`,
      [teacherId],
    );

    const periods = scheduleResult.rows.map((row) => ({
      id: row.id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      roomNumber: row.room_number,
      classId: row.class_id,
      className: row.class_name,
      sectionName: row.section_name,
      classCode: row.class_code,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
    }));

    sendResponse(res, 200, "Teacher timetable retrieved successfully", {
      teacherId,
      periods: sortByDayAndTime(periods),
    });
  },
);

export const getMyStudentTimetable = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const studentResult = await query(
      "SELECT id FROM students WHERE user_id = $1",
      [req.user.userId],
    );

    if (studentResult.rowCount === 0) {
      return sendError(res, 404, "Student profile not found for this user");
    }

    const studentId = studentResult.rows[0].id;

    const enrollmentResult = await query(
      `SELECT se.class_id, c.class_name, c.section_name, c.class_code
       FROM student_enrollments se
       JOIN classes c ON se.class_id = c.id
       WHERE se.student_id = $1 AND se.status = 'active'
       ORDER BY se.enrollment_date DESC
       LIMIT 1`,
      [studentId],
    );

    if (enrollmentResult.rowCount === 0) {
      return sendError(
        res,
        404,
        "No active class enrollment found for this student",
      );
    }

    const classInfo = enrollmentResult.rows[0];

    const scheduleResult = await query(
      `SELECT t.id, t.day_of_week, t.start_time, t.end_time, t.room_number,
              s.id as subject_id, s.subject_name, s.subject_code,
              u.first_name, u.last_name, tr.employee_id
       FROM timetables t
       JOIN subjects s ON t.subject_id = s.id
       JOIN teachers tr ON t.teacher_id = tr.id
       JOIN users u ON tr.user_id = u.id
       WHERE t.class_id = $1
       ORDER BY CASE t.day_of_week
         WHEN 'Monday' THEN 1
         WHEN 'Tuesday' THEN 2
         WHEN 'Wednesday' THEN 3
         WHEN 'Thursday' THEN 4
         WHEN 'Friday' THEN 5
         WHEN 'Saturday' THEN 6
         WHEN 'Sunday' THEN 7
         ELSE 8 END,
       t.start_time ASC`,
      [classInfo.class_id],
    );

    const periods = scheduleResult.rows.map((row) => ({
      id: row.id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      roomNumber: row.room_number,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
      teacherName: `${row.first_name} ${row.last_name}`,
      teacherEmployeeId: row.employee_id,
    }));

    sendResponse(res, 200, "Student timetable retrieved successfully", {
      studentId,
      class: {
        id: classInfo.class_id,
        className: classInfo.class_name,
        sectionName: classInfo.section_name,
        classCode: classInfo.class_code,
      },
      periods: sortByDayAndTime(periods),
    });
  },
);
