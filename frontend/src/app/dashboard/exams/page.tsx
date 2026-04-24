"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarPlus, PlusCircle } from "lucide-react";
import apiClient from "@/lib/api";

interface AcademicYearOption {
  id: string;
  yearName: string;
  isActive: boolean;
}

interface ClassOption {
  id: string;
  className: string;
  sectionName?: string;
  classCode: string;
}

interface SubjectOption {
  id: string;
  subjectName: string;
  subjectCode: string;
}

interface TeacherOption {
  id: string;
  teacherName: string;
  employeeId: string;
}

interface ExamItem {
  id: string;
  examName: string;
  examCode: string;
  description?: string;
  examType: "midterm" | "final" | "quiz" | "practical" | "other";
  startDate: string;
  endDate: string;
  totalMarks: number;
  passingMarks: number;
  schedulesCount: number;
  academicYear?: {
    id: string;
    yearName: string;
  };
}

interface ScheduleItem {
  id: string;
  examId: string;
  examName: string;
  examType: string;
  classId: string;
  className: string;
  sectionName?: string;
  subjectId: string;
  subjectName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  location?: string;
  invigilatorId?: string;
  invigilatorName?: string;
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

const examTypeOptions = ["midterm", "final", "quiz", "practical"] as const;

function ExamsPageContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");

  const [loading, setLoading] = useState(true);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null,
  );

  const [examForm, setExamForm] = useState({
    academicYearId: "",
    examName: "",
    examCode: "",
    examType: "midterm",
    startDate: "",
    endDate: "",
    totalMarks: "100",
    passingMarks: "40",
    description: "",
  });

  const [scheduleForm, setScheduleForm] = useState({
    examId: "",
    classId: "",
    subjectId: "",
    examDate: "",
    startTime: "",
    endTime: "",
    durationMinutes: "",
    location: "",
    invigilatorId: "",
  });

  const selectedClassSubjects = useMemo(() => {
    if (!scheduleForm.classId) return subjects;
    return subjects;
  }, [scheduleForm.classId, subjects]);

  const fetchMeta = async () => {
    const response = await apiClient.get("/academic/exams/meta");
    const data = response.data.data;
    setAcademicYears(data.academicYears || []);
    setClasses(data.classes || []);
    setSubjects(data.subjects || []);
    setTeachers(data.teachers || []);

    const activeYear = (data.academicYears || []).find(
      (year: AcademicYearOption) => year.isActive,
    );
    if (activeYear && !examForm.academicYearId) {
      setExamForm((prev) => ({ ...prev, academicYearId: activeYear.id }));
    }
  };

  const fetchExams = async () => {
    const query = studentId ? `?studentId=${studentId}` : "";
    const response = await apiClient.get(`/academic/exams${query}`);
    setExams(response.data.data || []);
  };

  const fetchSchedules = async () => {
    const query = studentId ? `?studentId=${studentId}` : "";
    const response = await apiClient.get(`/academic/exams/schedules${query}`);
    setSchedules(response.data.data || []);
  };

  const fetchStudentInfo = async (id: string) => {
    const response = await apiClient.get(`/academic/students/${id}`);
    const row = response.data.data;
    setStudentInfo({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      admissionNumber: row.admissionNumber,
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([fetchMeta(), fetchExams(), fetchSchedules()]);
      if (studentId) {
        await fetchStudentInfo(studentId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load exam data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingExam(true);
      setError("");
      setSuccess("");
      const payload = {
        academicYearId: examForm.academicYearId,
        examName: examForm.examName,
        examCode: examForm.examCode,
        examType: examForm.examType,
        startDate: examForm.startDate,
        endDate: examForm.endDate,
        totalMarks: Number(examForm.totalMarks),
        passingMarks: Number(examForm.passingMarks),
        description: examForm.description,
      };

      if (editingExamId) {
        await apiClient.put(`/academic/exams/${editingExamId}`, payload);
        setSuccess("Exam updated successfully");
      } else {
        await apiClient.post("/academic/exams", payload);
        setSuccess("Exam created successfully");
      }

      setExamForm((prev) => ({
        ...prev,
        examName: "",
        examCode: "",
        startDate: "",
        endDate: "",
        description: "",
      }));
      setEditingExamId(null);
      await fetchExams();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          (editingExamId ? "Failed to update exam" : "Failed to create exam"),
      );
    } finally {
      setSubmittingExam(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingSchedule(true);
      setError("");
      setSuccess("");

      const payload = {
        classId: scheduleForm.classId,
        subjectId: scheduleForm.subjectId,
        examDate: scheduleForm.examDate,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        durationMinutes: scheduleForm.durationMinutes
          ? Number(scheduleForm.durationMinutes)
          : null,
        location: scheduleForm.location,
        invigilatorId: scheduleForm.invigilatorId || null,
      };

      if (editingScheduleId) {
        await apiClient.put(
          `/academic/exams/schedules/${editingScheduleId}`,
          payload,
        );
        setSuccess("Exam schedule updated successfully");
      } else {
        await apiClient.post(
          `/academic/exams/${scheduleForm.examId}/schedules`,
          payload,
        );
        setSuccess("Exam schedule created successfully");
      }

      setScheduleForm({
        examId: "",
        classId: "",
        subjectId: "",
        examDate: "",
        startTime: "",
        endTime: "",
        durationMinutes: "",
        location: "",
        invigilatorId: "",
      });
      setEditingScheduleId(null);
      await fetchSchedules();
      await fetchExams();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          (editingScheduleId
            ? "Failed to update exam schedule"
            : "Failed to create exam schedule"),
      );
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const formatInputDate = (value: string) => {
    if (!value) return "";
    return value.slice(0, 10);
  };

  const formatInputTime = (value: string) => {
    if (!value) return "";
    return value.slice(0, 5);
  };

  const startEditExam = (exam: ExamItem) => {
    setEditingExamId(exam.id);
    setExamForm({
      academicYearId: exam.academicYear?.id || examForm.academicYearId,
      examName: exam.examName,
      examCode: exam.examCode,
      examType: exam.examType,
      startDate: formatInputDate(exam.startDate),
      endDate: formatInputDate(exam.endDate),
      totalMarks: String(exam.totalMarks),
      passingMarks: String(exam.passingMarks),
      description: exam.description || "",
    });
  };

  const cancelEditExam = () => {
    setEditingExamId(null);
    setExamForm((prev) => ({
      ...prev,
      examName: "",
      examCode: "",
      startDate: "",
      endDate: "",
      totalMarks: "100",
      passingMarks: "40",
      description: "",
    }));
  };

  const handleDeleteExam = async (examId: string) => {
    const confirmed = window.confirm(
      "Delete this exam? Linked schedules and marks may be affected.",
    );
    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await apiClient.delete(`/academic/exams/${examId}`);
      setSuccess("Exam deleted successfully");
      if (editingExamId === examId) {
        cancelEditExam();
      }
      await fetchExams();
      await fetchSchedules();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete exam");
    }
  };

  const startEditSchedule = (schedule: ScheduleItem) => {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      examId: schedule.examId,
      classId: schedule.classId,
      subjectId: schedule.subjectId,
      examDate: formatInputDate(schedule.examDate),
      startTime: formatInputTime(schedule.startTime),
      endTime: formatInputTime(schedule.endTime),
      durationMinutes: schedule.durationMinutes
        ? String(schedule.durationMinutes)
        : "",
      location: schedule.location || "",
      invigilatorId: schedule.invigilatorId || "",
    });
  };

  const cancelEditSchedule = () => {
    setEditingScheduleId(null);
    setScheduleForm({
      examId: "",
      classId: "",
      subjectId: "",
      examDate: "",
      startTime: "",
      endTime: "",
      durationMinutes: "",
      location: "",
      invigilatorId: "",
    });
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const confirmed = window.confirm("Delete this exam schedule?");
    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await apiClient.delete(`/academic/exams/schedules/${scheduleId}`);
      setSuccess("Exam schedule deleted successfully");
      if (editingScheduleId === scheduleId) {
        cancelEditSchedule();
      }
      await fetchSchedules();
      await fetchExams();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete exam schedule");
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading exam management...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <Link
          href={studentId ? `/dashboard/students/${studentId}` : "/dashboard"}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          {studentId ? "Back to Student Profile" : "Back to Dashboard"}
        </Link>
        <h1 className="text-4xl font-bold text-gray-800">Exam Management</h1>
        <p className="text-gray-600 mt-2">
          Create exams and configure exam schedules (midterm, final, quiz,
          practical)
        </p>
        {studentInfo && (
          <p className="mt-2 text-sm text-blue-700">
            Viewing schedules for {studentInfo.firstName} {studentInfo.lastName}{" "}
            ({studentInfo.admissionNumber})
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {!studentId && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <form
            onSubmit={handleCreateExam}
            className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
          >
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <PlusCircle size={20} className="text-blue-600" />
              Create Exam
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academic Year
              </label>
              <select
                title="Academic Year"
                value={examForm.academicYearId}
                onChange={(e) =>
                  setExamForm((prev) => ({
                    ...prev,
                    academicYearId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select Academic Year</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.yearName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Name
                </label>
                <input
                  title="Exam Name"
                  value={examForm.examName}
                  onChange={(e) =>
                    setExamForm((prev) => ({
                      ...prev,
                      examName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Midterm 2026"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Code
                </label>
                <input
                  title="Exam Code"
                  value={examForm.examCode}
                  onChange={(e) =>
                    setExamForm((prev) => ({
                      ...prev,
                      examCode: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="MID-2026"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Type
                </label>
                <select
                  title="Exam Type"
                  value={examForm.examType}
                  onChange={(e) =>
                    setExamForm((prev) => ({
                      ...prev,
                      examType: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {examTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  title="Start Date"
                  value={examForm.startDate}
                  onChange={(e) =>
                    setExamForm((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  title="End Date"
                  value={examForm.endDate}
                  onChange={(e) =>
                    setExamForm((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Marks
                </label>
                <input
                  type="number"
                  title="Total Marks"
                  min="1"
                  value={examForm.totalMarks}
                  onChange={(e) =>
                    setExamForm((prev) => ({
                      ...prev,
                      totalMarks: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passing Marks
                </label>
                <input
                  type="number"
                  title="Passing Marks"
                  min="1"
                  value={examForm.passingMarks}
                  onChange={(e) =>
                    setExamForm((prev) => ({
                      ...prev,
                      passingMarks: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                title="Exam Description"
                value={examForm.description}
                onChange={(e) =>
                  setExamForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={submittingExam}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg"
            >
              {submittingExam
                ? editingExamId
                  ? "Updating..."
                  : "Creating..."
                : editingExamId
                  ? "Update Exam"
                  : "Create Exam"}
            </button>
            {editingExamId && (
              <button
                type="button"
                onClick={cancelEditExam}
                className="ml-3 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </form>

          <form
            onSubmit={handleCreateSchedule}
            className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
          >
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <CalendarPlus size={20} className="text-blue-600" />
              Create Exam Schedule
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam
              </label>
              <select
                title="Select Exam"
                value={scheduleForm.examId}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    examId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select Exam</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.examName} ({exam.examType})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select
                  title="Select Class"
                  value={scheduleForm.classId}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      classId: e.target.value,
                      subjectId: "",
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.className}{" "}
                      {cls.sectionName ? `- ${cls.sectionName}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  title="Select Subject"
                  value={scheduleForm.subjectId}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      subjectId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Subject</option>
                  {selectedClassSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subjectName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Date
                </label>
                <input
                  type="date"
                  title="Exam Date"
                  value={scheduleForm.examDate}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      examDate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  title="Start Time"
                  value={scheduleForm.startTime}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  title="End Time"
                  value={scheduleForm.endTime}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  title="Duration Minutes"
                  min="1"
                  value={scheduleForm.durationMinutes}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      durationMinutes: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room / Location
                </label>
                <input
                  title="Room or Location"
                  value={scheduleForm.location}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invigilator
                </label>
                <select
                  title="Select Invigilator"
                  value={scheduleForm.invigilatorId}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      invigilatorId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Invigilator</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.teacherName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingSchedule}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg"
            >
              {submittingSchedule
                ? editingScheduleId
                  ? "Updating..."
                  : "Creating..."
                : editingScheduleId
                  ? "Update Schedule"
                  : "Create Schedule"}
            </button>
            {editingScheduleId && (
              <button
                type="button"
                onClick={cancelEditSchedule}
                className="ml-3 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Exams</h2>
        {exams.length === 0 ? (
          <p className="text-gray-500">No exams found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Exam
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Date Range
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Marks
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Schedules
                  </th>
                  {!studentId && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id} className="border-b border-gray-200">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {exam.examName}
                      </p>
                      <p className="text-xs text-gray-500">{exam.examCode}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 capitalize">
                      {exam.examType}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(exam.startDate)} - {formatDate(exam.endDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {exam.passingMarks}/{exam.totalMarks}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {exam.schedulesCount}
                    </td>
                    {!studentId && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditExam(exam)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExam(exam.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Exam Schedules
        </h2>
        {schedules.length === 0 ? (
          <p className="text-gray-500">No exam schedules found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Exam
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Invigilator
                  </th>
                  {!studentId && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="border-b border-gray-200">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {schedule.examName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {schedule.examType}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {schedule.className}
                      {schedule.sectionName ? ` - ${schedule.sectionName}` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {schedule.subjectName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(schedule.examDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {schedule.startTime} - {schedule.endTime}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {schedule.location || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {schedule.invigilatorName || "-"}
                    </td>
                    {!studentId && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditSchedule(schedule)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExamsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <ExamsPageContent />
    </Suspense>
  );
}
