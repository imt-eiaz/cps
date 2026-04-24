"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, Trash2 } from "lucide-react";
import apiClient from "@/lib/api";

interface ClassItem {
  id: string;
  className: string;
  sectionName?: string;
  classCode: string;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface TeacherItem {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  status: string;
}

interface Allocation {
  id: string;
  className: string;
  sectionName?: string;
  classCode: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  teacherEmployeeId: string;
  allocatedAt: string;
}

export default function SubjectAllocationPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    fetchAllocations();
  }, [page]);

  const fetchDropdownData = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes, teachersRes] = await Promise.all([
        apiClient.get("/academic/classes?page=1&limit=100"),
        apiClient.get("/academic/subjects?page=1&limit=100"),
        apiClient.get("/academic/teachers?page=1&limit=100"),
      ]);

      setClasses(classesRes.data.data || []);
      setSubjects(
        (subjectsRes.data.data || []).filter((s: SubjectItem) => s.isActive),
      );
      setTeachers(
        (teachersRes.data.data || []).filter(
          (t: TeacherItem) => t.status === "active",
        ),
      );
      setError("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load allocation form data",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      const response = await apiClient.get(
        `/academic/subjects/allocations?page=${page}&limit=10`,
      );
      setAllocations(response.data.data || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch allocations");
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClass || !selectedSubject || !selectedTeacher) {
      setError("Please select class, subject, and teacher");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await apiClient.post("/academic/subjects/allocations", {
        classId: selectedClass,
        subjectId: selectedSubject,
        teacherId: selectedTeacher,
      });

      setSuccessMessage("Subject allocated successfully");
      setSelectedClass("");
      setSelectedSubject("");
      setSelectedTeacher("");

      if (page !== 1) {
        setPage(1);
      } else {
        fetchAllocations();
      }

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to allocate subject");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAllocation = async (allocationId: string) => {
    if (!confirm("Remove this subject allocation?")) {
      return;
    }

    try {
      await apiClient.delete(`/academic/subjects/allocations/${allocationId}`);
      setSuccessMessage("Allocation removed successfully");
      fetchAllocations();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove allocation");
    }
  };

  const formatDateTime = (value: string) => {
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <Link
          href="/dashboard/subjects"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Subjects
        </Link>
        <h1 className="text-4xl font-bold text-gray-800">Subject Allocation</h1>
        <p className="text-gray-600 mt-2">
          Assign subjects to classes and teachers
        </p>
      </div>

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

      <form
        onSubmit={handleAllocate}
        className="bg-white border border-gray-200 rounded-lg p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loading || submitting}
            title="Select Class"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.className}
                {item.sectionName ? ` - ${item.sectionName}` : ""} (
                {item.classCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={loading || submitting}
            title="Select Subject"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Subject</option>
            {subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teacher
          </label>
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            disabled={loading || submitting}
            title="Select Teacher"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Teacher</option>
            {teachers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.firstName} {item.lastName} ({item.employeeId})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Layers size={18} />
          {submitting ? "Allocating..." : "Allocate"}
        </button>
      </form>

      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Class
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Teacher
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Allocated On
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <tr
                key={allocation.id}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">
                    {allocation.className}
                  </p>
                  <p className="text-sm text-gray-600">
                    {allocation.sectionName
                      ? `${allocation.sectionName} · `
                      : ""}
                    {allocation.classCode}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">
                    {allocation.subjectName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {allocation.subjectCode}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">
                    {allocation.teacherName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {allocation.teacherEmployeeId}
                  </p>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {formatDateTime(allocation.allocatedAt)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleDeleteAllocation(allocation.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Remove Allocation"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && allocations.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            No subject allocations found
          </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={`px-4 py-2 rounded-lg ${
                  page === pageNumber
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {pageNumber}
              </button>
            ),
          )}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
