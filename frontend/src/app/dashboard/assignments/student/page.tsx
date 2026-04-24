"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";

interface StudentAssignmentItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  subjectName: string;
  subjectCode: string;
  className: string;
  sectionName: string;
  submissionStatus: "pending" | "submitted" | "late" | "graded";
  submission: {
    id: string;
    marksObtained: number | null;
    feedback: string | null;
  } | null;
}

const statusClasses: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  late: "bg-red-100 text-red-800",
  graded: "bg-green-100 text-green-800",
};

function StudentAssignmentsPageContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId") || "";

  const [items, setItems] = useState<StudentAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, [studentId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get(
        "/academic/assignments/student/dashboard",
        {
          params: studentId ? { studentId } : undefined,
        },
      );
      setItems(response.data.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to load student assignment dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  const getCountdown = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)} day(s) overdue`;
    if (days === 0) return "Due today";
    return `${days} day(s) left`;
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-600">Loading student assignments...</div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Student Assignment Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Track assignment due dates, submission status and grading updates.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {item.subjectName} ({item.subjectCode})
                </p>
                <p className="text-sm text-gray-600">
                  {item.className} - Section {item.sectionName}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[item.submissionStatus] || "bg-gray-100 text-gray-700"}`}
              >
                {item.submissionStatus}
              </span>
            </div>

            <p className="text-sm text-gray-700 line-clamp-3">
              {item.description || "No description"}
            </p>

            <div className="text-sm text-gray-600 space-y-1">
              <p>Due Date: {new Date(item.dueDate).toLocaleDateString()}</p>
              <p>Countdown: {getCountdown(item.dueDate)}</p>
              <p>Total Marks: {item.totalMarks}</p>
              {item.submission?.marksObtained !== null &&
                item.submission?.marksObtained !== undefined && (
                  <p>Marks Obtained: {item.submission?.marksObtained}</p>
                )}
            </div>

            <div>
              <Link
                href={`/dashboard/assignments/${item.id}/submit`}
                className="inline-flex items-center px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
              >
                Open Submission Page
              </Link>
            </div>
          </div>
        ))}
      </div>

      {!error && items.length === 0 && (
        <div className="p-6 bg-white border border-gray-200 rounded-xl text-gray-600">
          No assignments available for this student.
        </div>
      )}
    </div>
  );
}

export default function StudentAssignmentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <StudentAssignmentsPageContent />
    </Suspense>
  );
}
