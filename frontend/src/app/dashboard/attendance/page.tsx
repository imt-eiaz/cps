"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Save,
  Download,
  Search,
  Users,
  HelpCircle,
} from "lucide-react";
import apiClient from "@/lib/api";

interface Class {
  id: string;
  className: string;
  sectionName: string;
  classCode: string;
  enrolledStudents: number;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  email: string;
  status: "present" | "absent" | "late" | "leave" | null;
  remarks: string;
}

interface Statistics {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  notMarked: number;
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    notMarked: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchClassAttendance();
      setHasUnsavedChanges(false);
    }
  }, [selectedClass, selectedDate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedClass && students.length > 0 && !saving) {
          saveAttendance();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedClass, students, saving]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchClasses = async () => {
    try {
      const response = await apiClient.get("/academic/classes?limit=100");
      setClasses(response.data.data);
    } catch (err: any) {
      setError("Failed to fetch classes");
    }
  };

  const fetchClassAttendance = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get(
        `/academic/attendance/class/${selectedClass}?date=${selectedDate}`,
      );
      setStudents(response.data.data.students);
      setStatistics(response.data.data.statistics);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) =>
        student.id === studentId
          ? { ...student, status: status as any }
          : student,
      ),
    );
    updateStatistics(studentId, status);
    setHasUnsavedChanges(true);
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) =>
        student.id === studentId ? { ...student, remarks } : student,
      ),
    );
    setHasUnsavedChanges(true);
  };

  const updateStatistics = (studentId: string, newStatus: string) => {
    setStatistics((prevStats) => {
      const student = students.find((s) => s.id === studentId);
      const oldStatus = student?.status;

      let newStats = { ...prevStats };

      // Decrease old status count
      if (oldStatus) {
        newStats[oldStatus] = Math.max(0, newStats[oldStatus] - 1);
      } else {
        newStats.notMarked = Math.max(0, newStats.notMarked - 1);
      }

      // Increase new status count
      if (newStatus) {
        newStats[newStatus as keyof Statistics] =
          (newStats[newStatus as keyof Statistics] as number) + 1;
      }

      return newStats;
    });
  };

  const markAllAsPresent = () => {
    setStudents((prevStudents) =>
      prevStudents.map((student) => ({ ...student, status: "present" })),
    );
    setStatistics({
      total: students.length,
      present: students.length,
      absent: 0,
      late: 0,
      leave: 0,
      notMarked: 0,
    });
    setHasUnsavedChanges(true);
  };

  const markAllAsAbsent = () => {
    setStudents((prevStudents) =>
      prevStudents.map((student) => ({ ...student, status: "absent" })),
    );
    setStatistics({
      total: students.length,
      present: 0,
      absent: students.length,
      late: 0,
      leave: 0,
      notMarked: 0,
    });
    setHasUnsavedChanges(true);
  };

  const clearAllStatus = () => {
    setStudents((prevStudents) =>
      prevStudents.map((student) => ({
        ...student,
        status: null,
        remarks: "",
      })),
    );
    setStatistics({
      total: students.length,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      notMarked: students.length,
    });
    setHasUnsavedChanges(false);
  };

  const exportAttendance = () => {
    if (students.length === 0) return;

    const csvContent = [
      ["Student Name", "Admission Number", "Status", "Remarks"],
      ...students.map((s) => [
        `${s.firstName} ${s.lastName}`,
        s.admissionNumber,
        s.status || "Not Marked",
        s.remarks || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${selectedClassName?.className}_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const saveAttendance = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const attendanceRecords = students.map((student) => ({
        studentId: student.id,
        status: student.status || "absent",
        remarks: student.remarks || "",
      }));

      await apiClient.post("/academic/attendance/bulk", {
        classId: selectedClass,
        attendanceDate: selectedDate,
        attendanceRecords,
      });

      setSuccessMessage("Attendance saved successfully!");
      setHasUnsavedChanges(false);

      // Refresh attendance data after successful save
      setTimeout(() => {
        fetchClassAttendance();
        setSuccessMessage("");
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "present":
        return <CheckCircle size={20} className="text-green-600" />;
      case "absent":
        return <XCircle size={20} className="text-red-600" />;
      case "late":
        return <Clock size={20} className="text-orange-600" />;
      case "leave":
        return <FileText size={20} className="text-blue-600" />;
      default:
        return <XCircle size={20} className="text-gray-400" />;
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedClassName = classes.find((c) => c.id === selectedClass);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              Mark Attendance
            </h1>
            <p className="text-gray-600 mt-2">
              Record daily attendance for students
            </p>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
          >
            <HelpCircle size={20} />
            Help Guide
          </button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  📋 Attendance System Guide
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-500 hover:text-gray-700"
                  title="Close help"
                  aria-label="Close help dialog"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  🚀 Quick Start
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Select your class from the dropdown</li>
                  <li>Choose the date (defaults to today)</li>
                  <li>Mark attendance for each student</li>
                  <li>Click &quot;Save Attendance&quot; or press Ctrl+S</li>
                </ol>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  ✅ Attendance Status Options
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="font-medium">Present:</span>
                    <span className="text-gray-600">
                      Student is present in class
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <XCircle className="text-red-600" size={20} />
                    <span className="font-medium">Absent:</span>
                    <span className="text-gray-600">Student is absent</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="text-orange-600" size={20} />
                    <span className="font-medium">Late:</span>
                    <span className="text-gray-600">Student arrived late</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="text-blue-600" size={20} />
                    <span className="font-medium">Leave:</span>
                    <span className="text-gray-600">
                      Student on authorized leave
                    </span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  ⚡ Quick Actions
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    <strong>All Present:</strong> Marks all students as present
                  </li>
                  <li>
                    <strong>All Absent:</strong> Marks all students as absent
                  </li>
                  <li>
                    <strong>Clear All:</strong> Removes all attendance marks
                  </li>
                  <li>
                    <strong>Export CSV:</strong> Downloads attendance as Excel
                    file
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  ⌨️ Keyboard Shortcuts
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <kbd className="px-2 py-1 bg-white border rounded">
                      Ctrl
                    </kbd>{" "}
                    + <kbd className="px-2 py-1 bg-white border rounded">S</kbd>{" "}
                    = Save attendance
                  </p>
                </div>
              </section>

              <section className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  ⚠️ Important
                </h3>
                <ul className="list-disc list-inside space-y-1 text-yellow-700 text-sm">
                  <li>Make sure to save before leaving the page</li>
                  <li>You&apos;ll be warned if you have unsaved changes</li>
                  <li>Attendance can be edited later if needed</li>
                  <li>The system auto-refreshes after saving</li>
                </ul>
              </section>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <label
                htmlFor="classSelect"
                className="block text-sm font-semibold text-gray-700"
              >
                Select Class *
              </label>
            </div>
            <select
              id="classSelect"
              value={selectedClass}
              onChange={(e) => {
                if (hasUnsavedChanges) {
                  if (
                    !confirm(
                      "You have unsaved changes. Are you sure you want to switch classes?",
                    )
                  ) {
                    return;
                  }
                }
                setSelectedClass(e.target.value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select a Class --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.className}
                  {cls.sectionName ? ` - ${cls.sectionName}` : ""} (
                  {cls.classCode}) - {cls.enrolledStudents} students
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <label
                htmlFor="dateSelect"
                className="block text-sm font-semibold text-gray-700"
              >
                Select Date *
              </label>
            </div>
            <input
              id="dateSelect"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (hasUnsavedChanges) {
                  if (
                    !confirm(
                      "You have unsaved changes. Are you sure you want to change the date?",
                    )
                  ) {
                    return;
                  }
                }
                setSelectedDate(e.target.value);
              }}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {selectedClass && selectedDate && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">💡 Quick Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Click on status dropdown to mark individual students</li>
              <li>
                Use &quot;All Present&quot; / &quot;All Absent&quot; for quick
                marking
              </li>
              <li>
                Press <kbd className="px-1 bg-white border rounded">Ctrl+S</kbd>{" "}
                to save quickly
              </li>
              <li>Add remarks for students who are late or on leave</li>
            </ul>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* Statistics */}
      {selectedClass && students.length > 0 && (
        <>
          {/* Step-by-step Guide */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Mark Attendance
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  Click status dropdowns below to mark individual students, or
                  use quick actions:
                </p>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-white border border-green-300 text-green-700 rounded-full text-xs font-medium">
                    ✓ Click "All Present" for quick marking
                  </span>
                  <span className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-full text-xs font-medium">
                    📝 Select individual status from dropdowns
                  </span>
                  <span className="px-3 py-1 bg-white border border-purple-300 text-purple-700 rounded-full text-xs font-medium">
                    💬 Add remarks if needed
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-blue-600" />
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.total}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-xs text-gray-600">Present</p>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {statistics.present}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="flex items-center gap-2 mb-1">
                <XCircle size={16} className="text-red-600" />
                <p className="text-xs text-gray-600">Absent</p>
              </div>
              <p className="text-2xl font-bold text-red-700">
                {statistics.absent}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-orange-600" />
                <p className="text-xs text-gray-600">Late</p>
              </div>
              <p className="text-2xl font-bold text-orange-700">
                {statistics.late}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-400">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-blue-600" />
                <p className="text-xs text-gray-600">Leave</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {statistics.leave}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={16} className="text-gray-600" />
                <p className="text-xs text-gray-600">Not Marked</p>
              </div>
              <p className="text-2xl font-bold text-gray-700">
                {statistics.notMarked}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                Save Attendance
              </h3>
            </div>
            <div className="flex gap-4 flex-wrap items-center">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={markAllAsPresent}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <CheckCircle size={16} />
                  All Present
                </button>

                <button
                  onClick={markAllAsAbsent}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <XCircle size={16} />
                  All Absent
                </button>

                <button
                  onClick={clearAllStatus}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
                >
                  Clear All
                </button>
              </div>

              <div className="flex-1"></div>

              <div className="flex gap-2">
                <button
                  onClick={exportAttendance}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
                >
                  <Download size={16} />
                  Export CSV
                </button>

                <button
                  onClick={saveAttendance}
                  disabled={saving}
                  className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed ${
                    hasUnsavedChanges
                      ? "bg-blue-600 text-white hover:bg-blue-700 animate-pulse"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <Save size={18} />
                  {saving
                    ? "Saving..."
                    : hasUnsavedChanges
                      ? "Save Changes"
                      : "Save Attendance"}
                </button>
              </div>
            </div>

            {hasUnsavedChanges && (
              <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-orange-600 rounded-full animate-pulse"></span>
                You have unsaved changes. Press Ctrl+S or click Save to save.
              </p>
            )}
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search
                className="absolute left-3 top-3 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search students..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">
                Students - {selectedClassName?.className}
                {selectedClassName?.sectionName &&
                  ` (${selectedClassName.sectionName})`}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg">No students found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admission No.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(student.status)}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {student.admissionNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            aria-label="Attendance status"
                            value={student.status || ""}
                            onChange={(e) =>
                              handleStatusChange(student.id, e.target.value)
                            }
                            className={`px-3 py-1 rounded-full text-sm font-medium border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              student.status === "present"
                                ? "bg-green-100 text-green-800 border-green-300"
                                : student.status === "absent"
                                  ? "bg-red-100 text-red-800 border-red-300"
                                  : student.status === "late"
                                    ? "bg-orange-100 text-orange-800 border-orange-300"
                                    : student.status === "leave"
                                      ? "bg-blue-100 text-blue-800 border-blue-300"
                                      : "bg-gray-100 text-gray-800 border-gray-300"
                            }`}
                          >
                            <option value="">Not Marked</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="leave">Leave</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={student.remarks || ""}
                            onChange={(e) =>
                              handleRemarksChange(student.id, e.target.value)
                            }
                            placeholder="Add remarks..."
                            className="w-full px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* No Students State */}
      {selectedClass && !loading && students.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Users size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            No Students Enrolled
          </h3>
          <p className="text-gray-600 mb-4">
            The selected class &quot;{selectedClassName?.className}&quot; has no
            enrolled students.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              <strong>What to do:</strong> Students need to be enrolled in this
              class before you can mark attendance. Please contact your
              administrator or go to the Classes section to enroll students.
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedClass && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Select a Class to Begin
          </h3>
          <p className="text-gray-600">
            Choose a class and date to mark attendance for students
          </p>
        </div>
      )}
    </div>
  );
}
