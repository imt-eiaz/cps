"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Users,
  BarChart3,
  Edit,
  Trash2,
} from "lucide-react";
import apiClient from "@/lib/api";

interface ClassDetails {
  id: string;
  academicYearId: string;
  className: string;
  sectionName: string;
  classCode: string;
  classTeacherId?: string;
  studentCapacity: number;
  description?: string;
  academicYearName?: string;
  classTeacherName?: string;
  enrolledStudents?: number;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  admissionNumber: string;
  dateOfBirth: string;
  gender: string;
  enrollmentDate?: string;
  enrollmentStatus?: string;
}

interface Subject {
  id: string;
  subject_name: string;
  subject_code: string;
  credit_hours: number;
  teacher_name?: string;
}

export default function ClassDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);

  useEffect(() => {
    fetchClassDetails();
  }, [params.id]);

  useEffect(() => {
    if (classDetails) {
      fetchClassStudents();
    }
  }, [classDetails, studentPage]);

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      const [classRes, subjectsRes] = await Promise.all([
        apiClient.get(`/academic/classes/${params.id}`),
        apiClient.get(`/academic/classes/${params.id}/subjects`),
      ]);
      setClassDetails(classRes.data.data);
      setSubjects(subjectsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch class details");
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async () => {
    try {
      const response = await apiClient.get(
        `/academic/classes/${params.id}/students?page=${studentPage}&limit=20`,
      );
      setStudents(response.data.data || []);
      setStudentTotalPages(response.data.pagination?.pages || 1);
    } catch (err: any) {
      console.error("Failed to fetch students:", err);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return "N/A";
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const getCapacityPercentage = () => {
    if (!classDetails) return 0;
    return Math.round(
      ((classDetails.enrolledStudents || 0) / classDetails.studentCapacity) *
        100,
    );
  };

  const getCapacityColor = () => {
    const percentage = getCapacityPercentage();
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading class details...</p>
      </div>
    );
  }

  if (error || !classDetails) {
    return (
      <div className="p-6">
        <Link
          href="/dashboard/classes"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Classes
        </Link>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || "Class not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/classes"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Classes
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              {classDetails.className}
            </h1>
            <p className="text-gray-600 mt-2">
              Section: {classDetails.sectionName} | Code:{" "}
              {classDetails.classCode}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg">
              <Edit size={20} />
            </button>
            <button className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg">
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Capacity</p>
              <p className="text-2xl font-bold text-gray-800">
                {classDetails.studentCapacity}
              </p>
            </div>
            <BarChart3 size={32} className="text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Enrolled</p>
              <p className="text-2xl font-bold text-gray-800">
                {classDetails.enrolledStudents || 0}
              </p>
            </div>
            <Users size={32} className="text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Available</p>
              <p className="text-2xl font-bold text-gray-800">
                {classDetails.studentCapacity -
                  (classDetails.enrolledStudents || 0)}
              </p>
            </div>
            <Users size={32} className="text-yellow-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Occupancy</p>
              <p className={`text-2xl font-bold ${getCapacityColor()}`}>
                {getCapacityPercentage()}%
              </p>
            </div>
            <BarChart3 size={32} className="text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Class Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Class Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 text-sm mb-2">Class Name</p>
              <p className="text-gray-900 font-semibold">
                {classDetails.className}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-2">Section</p>
              <p className="text-gray-900 font-semibold">
                {classDetails.sectionName}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-2">Class Code</p>
              <p className="text-gray-900 font-semibold">
                {classDetails.classCode}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-2">Academic Year</p>
              <p className="text-gray-900 font-semibold">
                {classDetails.academicYearName}
              </p>
            </div>
          </div>

          {classDetails.description && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-600 text-sm mb-2">Description</p>
              <p className="text-gray-900">{classDetails.description}</p>
            </div>
          )}
        </div>

        {/* Class Teacher Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Class Teacher
          </h2>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">
              {classDetails.classTeacherName
                ? classDetails.classTeacherName.charAt(0).toUpperCase()
                : "N"}
            </div>
            <p className="text-lg font-semibold text-gray-800">
              {classDetails.classTeacherName || "Not Assigned"}
            </p>
          </div>
        </div>
      </div>

      {/* Subjects */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Subjects Teaching
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BookOpen size={20} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {subject.subject_name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Code: {subject.subject_code}
                    </p>
                    {subject.credit_hours && (
                      <p className="text-sm text-gray-600">
                        Credits: {subject.credit_hours}
                      </p>
                    )}
                    {subject.teacher_name && (
                      <p className="text-sm text-blue-600 mt-2">
                        Teacher: {subject.teacher_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrolled Students */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Enrolled Students ({students.length})
        </h2>

        {students.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Admission #
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Age
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Enrollment Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/students/${student.id}`}
                          className="font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {student.firstName} {student.lastName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {student.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm font-medium">
                          {student.admissionNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {calculateAge(student.dateOfBirth)} years
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {student.gender}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(student.enrollmentDate || "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {studentTotalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => setStudentPage(Math.max(1, studentPage - 1))}
                  disabled={studentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: studentTotalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setStudentPage(p)}
                      className={`px-4 py-2 rounded-lg ${
                        studentPage === p
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    setStudentPage(Math.min(studentTotalPages, studentPage + 1))
                  }
                  disabled={studentPage === studentTotalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No students enrolled in this class</p>
          </div>
        )}
      </div>
    </div>
  );
}
