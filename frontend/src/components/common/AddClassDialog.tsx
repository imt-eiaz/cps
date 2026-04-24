"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import apiClient from "@/lib/api";

interface AddClassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClassAdded: () => void;
}

interface ClassFormData {
  academicYearId: string;
  className: string;
  sectionName: string;
  classCode: string;
  classTeacherId: string;
  studentCapacity: string;
  description: string;
}

interface AcademicYear {
  id: string;
  yearName: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

interface AcademicYearFormData {
  yearName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function AddClassDialog({
  isOpen,
  onClose,
  onClassAdded,
}: AddClassDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showCreateYear, setShowCreateYear] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [formData, setFormData] = useState<ClassFormData>({
    academicYearId: "",
    className: "",
    sectionName: "",
    classCode: "",
    classTeacherId: "",
    studentCapacity: "40",
    description: "",
  });
  const [yearFormData, setYearFormData] = useState<AcademicYearFormData>({
    yearName: "",
    startDate: "",
    endDate: "",
    isActive: false,
  });

  // Fetch academic years and teachers when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen]);

  const fetchDropdownData = async () => {
    try {
      setFetchingData(true);

      // Fetch academic years
      const yearRes = await apiClient.get(
        "/academic/classes/data/academic-years",
      );
      setAcademicYears(
        yearRes.data.data.map((y: any) => ({
          id: y.id,
          yearName: y.yearName,
        })),
      );

      // Fetch teachers
      const teachersRes = await apiClient.get(
        "/academic/teachers?page=1&limit=100",
      );
      setTeachers(
        teachersRes.data.data.map((t: any) => ({
          id: t.id,
          firstName: t.firstName,
          lastName: t.lastName,
        })),
      );
    } catch (err: any) {
      console.error("Failed to fetch dropdown data:", err);
      setError("Failed to load form data. Please try again.");
    } finally {
      setFetchingData(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setYearFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !yearFormData.yearName ||
      !yearFormData.startDate ||
      !yearFormData.endDate
    ) {
      setError("Please fill in all required year fields");
      return;
    }

    if (new Date(yearFormData.startDate) >= new Date(yearFormData.endDate)) {
      setError("Start date must be before end date");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post(
        "/academic/classes/data/academic-years",
        {
          yearName: yearFormData.yearName,
          startDate: yearFormData.startDate,
          endDate: yearFormData.endDate,
          isActive: yearFormData.isActive,
        },
      );

      // Add new year to list
      const newYear = response.data.data;
      setAcademicYears([
        ...academicYears,
        {
          id: newYear.id,
          yearName: newYear.yearName,
        },
      ]);

      // Set it as selected
      setFormData((prev) => ({
        ...prev,
        academicYearId: newYear.id,
      }));

      // Reset year form
      setYearFormData({
        yearName: "",
        startDate: "",
        endDate: "",
        isActive: false,
      });

      setShowCreateYear(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create academic year",
      );
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (
      !formData.academicYearId ||
      !formData.className ||
      !formData.classCode
    ) {
      setError("Please fill in all required fields");
      return false;
    }

    if (formData.studentCapacity && parseInt(formData.studentCapacity) <= 0) {
      setError("Student capacity must be greater than 0");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/academic/classes", {
        academicYearId: formData.academicYearId,
        className: formData.className,
        sectionName: formData.sectionName || null,
        classCode: formData.classCode,
        classTeacherId: formData.classTeacherId || null,
        studentCapacity: parseInt(formData.studentCapacity) || 40,
        description: formData.description || null,
      });

      setSuccess(true);
      setFormData({
        academicYearId: "",
        className: "",
        sectionName: "",
        classCode: "",
        classTeacherId: "",
        studentCapacity: "40",
        description: "",
      });

      setTimeout(() => {
        onClassAdded();
        onClose();
        setSuccess(false);
      }, 1000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to add class. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Add New Class</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
            title="Close dialog"
            aria-label="Close dialog"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              Class added successfully! Refreshing list...
            </div>
          )}

          {/* Loading State */}
          {fetchingData ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Loading form data...</p>
            </div>
          ) : academicYears.length === 0 && !showCreateYear ? (
            // Show option to create academic year when none exist
            <div className="p-8 text-center">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 mb-4">
                  No academic years found. Please create one to add classes.
                </p>
                <button
                  onClick={() => setShowCreateYear(true)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Create Academic Year
                </button>
              </div>
            </div>
          ) : showCreateYear ? (
            // Show academic year creation form
            <div className="">
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                  Create Academic Year
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="yearName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Year Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="yearName"
                      type="text"
                      name="yearName"
                      value={yearFormData.yearName}
                      onChange={handleYearChange}
                      placeholder="2024-2025, Academic Year 2024, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="startDate"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      name="startDate"
                      value={yearFormData.startDate}
                      onChange={handleYearChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="endDate"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      name="endDate"
                      value={yearFormData.endDate}
                      onChange={handleYearChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={yearFormData.isActive}
                        onChange={handleYearChange}
                        className="rounded"
                        disabled={loading}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Set as Active
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateYear(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateYear}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      Creating...
                    </>
                  ) : (
                    "Create Year"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Section: Class Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                  Class Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="academicYearId"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="academicYearId"
                      name="academicYearId"
                      value={formData.academicYearId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                      title="Select academic year"
                    >
                      <option value="">Select academic year</option>
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.yearName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="className"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Class Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="className"
                      type="text"
                      name="className"
                      value={formData.className}
                      onChange={handleChange}
                      placeholder="Class 10A, Class X, Grade 10, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="sectionName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Section Name
                    </label>
                    <input
                      id="sectionName"
                      type="text"
                      name="sectionName"
                      value={formData.sectionName}
                      onChange={handleChange}
                      placeholder="Section A, Section 1, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="classCode"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Class Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="classCode"
                      type="text"
                      name="classCode"
                      value={formData.classCode}
                      onChange={handleChange}
                      placeholder="X-A, 10-1, etc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Class Configuration */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                  Class Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="studentCapacity"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Student Capacity (Default: 40)
                    </label>
                    <input
                      id="studentCapacity"
                      type="number"
                      name="studentCapacity"
                      value={formData.studentCapacity}
                      onChange={handleChange}
                      placeholder="40"
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="classTeacherId"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Class Teacher (Optional)
                    </label>
                    <select
                      id="classTeacherId"
                      name="classTeacherId"
                      value={formData.classTeacherId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading || teachers.length === 0}
                      title="Select class teacher"
                    >
                      <option value="">Select a teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Description */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                  Additional Information
                </h3>
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Add any additional information about this class..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end border-t border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      Adding...
                    </>
                  ) : (
                    "Add Class"
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
