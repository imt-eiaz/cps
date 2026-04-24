"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";
import { ExamSummary } from "@/types";
import {
  FileText,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Clock,
} from "lucide-react";

function ResultsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [noStudentSelected, setNoStudentSelected] = useState(false);

  useEffect(() => {
    const selectedStudentId = searchParams.get("studentId");
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      setLoading(false);
      setError("Please login to view results");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.roleName === "student") {
      fetchStudentId();
    } else if (selectedStudentId) {
      setNoStudentSelected(false);
      setStudentId(selectedStudentId);
      fetchStudentProfile(selectedStudentId);
    } else {
      setLoading(false);
      setError("");
      setNoStudentSelected(true);
    }
  }, [searchParams]);

  const fetchStudentId = async () => {
    try {
      const response = await apiClient.get(`/academic/students/me`);
      const student = response.data.data;
      if (student?.id) {
        setStudentId(student.id);
        setSelectedStudentName(`${student.firstName} ${student.lastName}`);
      } else {
        setError("Student profile not found");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Failed to fetch student ID:", error);
      setError(
        error.response?.data?.message || "Failed to load student profile",
      );
      setLoading(false);
    }
  };

  const fetchStudentProfile = async (id: string) => {
    try {
      const response = await apiClient.get(`/academic/students/${id}`);
      const student = response.data.data;
      if (student?.firstName || student?.lastName) {
        setSelectedStudentName(
          `${student.firstName || ""} ${student.lastName || ""}`.trim(),
        );
      }
    } catch (profileError) {
      console.error("Failed to fetch selected student profile:", profileError);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchResults();
    }
  }, [studentId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/academic/marks/student/${studentId}`,
      );
      setResults(response.data.data);
      setError("");
    } catch (error: any) {
      console.error("Failed to fetch results:", error);
      setError(error.response?.data?.message || "Failed to fetch results");
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-600 bg-green-50";
    if (grade === "B") return "text-blue-600 bg-blue-50";
    if (grade === "C") return "text-yellow-600 bg-yellow-50";
    if (grade === "D") return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (noStudentSelected) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Exam Results
          </h1>
          <p className="text-gray-600">Select a student to view exam results</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-900 font-semibold mb-2">
            No student selected
          </p>
          <p className="text-blue-700 mb-4 text-sm">
            Open a student profile and click “View Results & Exams” to load
            their published and draft exam results.
          </p>
          <Link
            href="/dashboard/students"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Students
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Exam Results</h1>
        <p className="text-gray-600">
          {selectedStudentName
            ? `Viewing academic performance for ${selectedStudentName}`
            : "View academic performance"}
        </p>
        {studentId && searchParams.get("studentId") && (
          <Link
            href={`/dashboard/students/${studentId}`}
            className="inline-block mt-3 text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Student Profile
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Overall Statistics */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <FileText className="mb-2" size={32} />
            <p className="text-sm opacity-90">Total Exams</p>
            <p className="text-4xl font-bold">{results.length}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <TrendingUp className="mb-2" size={32} />
            <p className="text-sm opacity-90">Average Percentage</p>
            <p className="text-4xl font-bold">
              {Math.round(
                results.reduce((sum, r) => sum + r.percentage, 0) /
                  results.length,
              )}
              %
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <Award className="mb-2" size={32} />
            <p className="text-sm opacity-90">Average GPA</p>
            <p className="text-4xl font-bold">
              {(
                results.reduce((sum, r) => sum + r.overallGPA, 0) /
                results.length
              ).toFixed(2)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <CheckCircle className="mb-2" size={32} />
            <p className="text-sm opacity-90">Passed Exams</p>
            <p className="text-4xl font-bold">
              {results.filter((r) => r.percentage >= 40).length}/
              {results.length}
            </p>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Calendar size={24} className="text-blue-600" />
            Exam History
          </h2>
        </div>

        {results.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No exam results available</p>
            <p className="text-sm mt-2">
              Results will appear here once they are published
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {results.map((result) => (
              <div
                key={result.examId}
                className="p-6 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {result.examName}
                      </h3>
                      {result.isPublished ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <CheckCircle size={14} />
                          Published
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <Clock size={14} />
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{result.academicYear}</span>
                      {result.term && (
                        <>
                          <span>•</span>
                          <span>{result.term}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDate(result.date)}</span>
                      <span>•</span>
                      <span>{result.subjectsCount} subjects</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Marks</p>
                    <p className="text-lg font-bold text-gray-800">
                      {result.totalObtained}/{result.totalMax}
                    </p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Percentage</p>
                    <p className="text-lg font-bold text-gray-800">
                      {result.percentage.toFixed(2)}%
                    </p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Grade</p>
                    <p
                      className={`text-lg font-bold rounded-full px-3 py-1 ${getGradeColor(result.overallGrade)}`}
                    >
                      {result.overallGrade}
                    </p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">GPA</p>
                    <p className="text-lg font-bold text-gray-800">
                      {result.overallGPA.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Status</p>
                    <p
                      className={`text-lg font-bold ${result.percentage >= 40 ? "text-green-600" : "text-red-600"}`}
                    >
                      {result.percentage >= 40 ? "Pass" : "Fail"}
                    </p>
                  </div>
                </div>

                {result.absentCount > 0 && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700">
                      <XCircle size={16} className="inline mr-2" />
                      Absent in {result.absentCount} subject
                      {result.absentCount > 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      router.push(
                        `/dashboard/results/${studentId}/${result.examId}`,
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Eye size={18} />
                    View Details
                  </button>

                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                    <Download size={18} />
                    Download PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <ResultsPageContent />
    </Suspense>
  );
}
