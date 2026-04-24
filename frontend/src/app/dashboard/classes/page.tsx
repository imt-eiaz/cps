"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Edit, Eye } from "lucide-react";
import apiClient from "@/lib/api";
import AddClassDialog from "@/components/common/AddClassDialog";

interface Class {
  id: string;
  academicYearId: string;
  className: string;
  sectionName: string;
  classCode: string;
  classTeacherId: string;
  studentCapacity: number;
  description?: string;
  academicYearName?: string;
  classTeacherName?: string;
  enrolledStudents?: number;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, [page]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/academic/classes?page=${page}&limit=10`,
      );
      const data = response.data.data;
      setClasses(data);
      setTotalPages(response.data.pagination.pages);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch classes");
    } finally {
      setLoading(false);
    }
  };

  const handleClassAdded = () => {
    setPage(1);
    fetchClasses();
  };

  const filteredClasses = classes.filter(
    (cls) =>
      cls.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.classCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.sectionName &&
        cls.sectionName.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const getCapacityStatus = (enrolled: number, capacity: number) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return "bg-red-100 text-red-800";
    if (percentage >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
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
        <h1 className="text-4xl font-bold text-gray-800">Classes</h1>
        <p className="text-gray-600 mt-2">Manage all classes and enrollments</p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by class name or code..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Class
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading classes...</p>
        </div>
      )}

      {/* Classes Table */}
      {!loading && filteredClasses.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Class Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Class Teacher
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Enrollment
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Year
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((cls) => (
                <tr
                  key={cls.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">
                      {cls.className}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {cls.classCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{cls.sectionName}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {cls.classTeacherName || "Not Assigned"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCapacityStatus(
                        cls.enrolledStudents || 0,
                        cls.studentCapacity,
                      )}`}
                    >
                      {cls.enrolledStudents || 0}/{cls.studentCapacity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {cls.academicYearName}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/dashboard/classes/${cls.id}`}
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded"
                      >
                        <Eye size={18} />
                      </Link>
                      <button
                        className="text-yellow-600 hover:text-yellow-800 p-2 hover:bg-yellow-50 rounded"
                        title="Edit Class"
                      >
                        <Edit size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredClasses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 text-lg">
            {classes.length === 0
              ? "No classes found"
              : "No classes match your search"}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-4 py-2 rounded-lg ${
                page === p
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Add Class Dialog */}
      <AddClassDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onClassAdded={handleClassAdded}
      />
    </div>
  );
}
