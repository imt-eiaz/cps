"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  UserPlus,
  Users,
  GraduationCap,
  UserMinus,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import apiClient from "@/lib/api";

interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  admissionNumber: string;
  classId: string;
  className: string;
  sectionName: string;
  classCode: string;
  academicYear: string;
  enrollmentDate: string;
  status: string;
}

interface Class {
  id: string;
  className: string;
  sectionName: string;
  classCode: string;
  studentCapacity: number;
  enrolledStudents: number;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  admissionNumber: string;
  status: string;
}

interface Stats {
  active_enrollments: string;
  inactive_enrollments: string;
  graduated_enrollments: string;
  transferred_enrollments: string;
  total_enrolled_students: string;
  classes_with_enrollments: string;
}

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [selectedClassForEnroll, setSelectedClassForEnroll] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchEnrollments();
    fetchStats();
    fetchClasses();
  }, [page, statusFilter]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/academic/enrollments?page=${page}&limit=10&status=${statusFilter}`,
      );
      setEnrollments(response.data.data);
      setTotalPages(response.data.pagination.pages);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch enrollments");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get("/academic/enrollments/stats");
      setStats(response.data.data);
    } catch (err: any) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await apiClient.get("/academic/classes?limit=100");
      setClasses(response.data.data);
    } catch (err: any) {
      console.error("Failed to fetch classes:", err);
    }
  };

  const fetchAvailableStudents = async (classId: string) => {
    try {
      const response = await apiClient.get(
        `/academic/enrollments/available-students?classId=${classId}`,
      );
      setAvailableStudents(response.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch available students",
      );
    }
  };

  const handleOpenEnrollDialog = () => {
    setIsEnrollDialogOpen(true);
    setSelectedClassForEnroll("");
    setSelectedStudent("");
    setEnrollmentDate(new Date().toISOString().split("T")[0]);
    setAvailableStudents([]);
  };

  const handleClassSelectForEnroll = async (classId: string) => {
    setSelectedClassForEnroll(classId);
    setSelectedStudent("");
    if (classId) {
      await fetchAvailableStudents(classId);
    } else {
      setAvailableStudents([]);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedClassForEnroll || !enrollmentDate) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setEnrolling(true);
      await apiClient.post("/academic/enrollments", {
        studentId: selectedStudent,
        classId: selectedClassForEnroll,
        enrollmentDate,
        status: "active",
      });

      setSuccessMessage("Student enrolled successfully!");
      setIsEnrollDialogOpen(false);
      fetchEnrollments();
      fetchStats();
      fetchClasses();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to enroll student");
      setTimeout(() => setError(""), 5000);
    } finally {
      setEnrolling(false);
    }
  };

  const handleUpdateStatus = async (
    enrollmentId: string,
    newStatus: string,
  ) => {
    try {
      await apiClient.patch(`/academic/enrollments/${enrollmentId}/status`, {
        status: newStatus,
      });

      setSuccessMessage("Enrollment status updated successfully!");
      fetchEnrollments();
      fetchStats();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to update enrollment status",
      );
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this enrollment? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await apiClient.delete(`/academic/enrollments/${enrollmentId}`);

      setSuccessMessage("Enrollment deleted successfully!");
      fetchEnrollments();
      fetchStats();
      fetchClasses();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete enrollment");
      setTimeout(() => setError(""), 5000);
    }
  };

  const filteredEnrollments = enrollments.filter(
    (enrollment) =>
      enrollment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.admissionNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      enrollment.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.classCode.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      graduated: "bg-blue-100 text-blue-800",
      transferred: "bg-orange-100 text-orange-800",
    };
    return styles[status as keyof typeof styles] || styles.inactive;
  };

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
        <h1 className="text-4xl font-bold text-gray-800">
          Student Enrollments
        </h1>
        <p className="text-gray-600 mt-2">
          Manage student enrollments in classes
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-green-600" />
              <p className="text-xs text-gray-600">Active</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {stats.active_enrollments}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
            <div className="flex items-center gap-2 mb-1">
              <UserMinus size={16} className="text-gray-600" />
              <p className="text-xs text-gray-600">Inactive</p>
            </div>
            <p className="text-2xl font-bold text-gray-700">
              {stats.inactive_enrollments}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap size={16} className="text-blue-600" />
              <p className="text-xs text-gray-600">Graduated</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {stats.graduated_enrollments}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} className="text-orange-600" />
              <p className="text-xs text-gray-600">Transferred</p>
            </div>
            <p className="text-2xl font-bold text-orange-700">
              {stats.transferred_enrollments}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-purple-600" />
              <p className="text-xs text-gray-600">Total Students</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {stats.total_enrolled_students}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap size={16} className="text-indigo-600" />
              <p className="text-xs text-gray-600">Classes</p>
            </div>
            <p className="text-2xl font-bold text-indigo-700">
              {stats.classes_with_enrollments}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}

      {/* Actions Bar */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 relative min-w-[300px]">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by student name, admission number, or class..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="graduated">Graduated</option>
          <option value="transferred">Transferred</option>
        </select>

        <button
          onClick={handleOpenEnrollDialog}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <UserPlus size={20} />
          Enroll Student
        </button>
      </div>

      {/* Enrollments Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-4">No enrollments found</p>
          <button
            onClick={handleOpenEnrollDialog}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enroll First Student
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admission No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Academic Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enrollment Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {enrollment.studentName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {enrollment.studentEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {enrollment.admissionNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {enrollment.className}
                            {enrollment.sectionName &&
                              ` - ${enrollment.sectionName}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {enrollment.classCode}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {enrollment.academicYear}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(
                          enrollment.enrollmentDate,
                        ).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={enrollment.status}
                          onChange={(e) =>
                            handleUpdateStatus(enrollment.id, e.target.value)
                          }
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(enrollment.status)}`}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="graduated">Graduated</option>
                          <option value="transferred">Transferred</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDeleteEnrollment(enrollment.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                          title="Delete enrollment"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Enroll Student Dialog */}
      {isEnrollDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Enroll Student
                </h2>
                <button
                  onClick={() => setIsEnrollDialogOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleEnrollStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class *
                  </label>
                  <select
                    value={selectedClassForEnroll}
                    onChange={(e) => handleClassSelectForEnroll(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.className}
                        {cls.sectionName ? ` - ${cls.sectionName}` : ""} (
                        {cls.classCode}) - {cls.enrolledStudents}/
                        {cls.studentCapacity}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClassForEnroll && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student *
                    </label>
                    {availableStudents.length === 0 ? (
                      <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                        No available students for this class. All students are
                        already enrolled.
                      </p>
                    ) : (
                      <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">-- Select Student --</option>
                        {availableStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.fullName} ({student.admissionNumber})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enrollment Date *
                  </label>
                  <input
                    type="date"
                    value={enrollmentDate}
                    onChange={(e) => setEnrollmentDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEnrollDialogOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enrolling || availableStudents.length === 0}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enrolling ? "Enrolling..." : "Enroll Student"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
