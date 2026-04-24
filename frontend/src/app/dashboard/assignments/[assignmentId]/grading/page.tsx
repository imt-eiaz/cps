"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api";

interface GradingStudentRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  submission: {
    id: string;
    submissionDate: string;
    fileUrl: string | null;
    submissionText: string | null;
    marksObtained: number | null;
    feedback: string | null;
    status: string;
  } | null;
}

interface GradingData {
  assignment: {
    id: string;
    title: string;
    totalMarks: number;
    className: string;
    sectionName: string;
    subjectName: string;
    subjectCode: string;
  };
  students: GradingStudentRow[];
}

export default function AssignmentGradingPage({
  params,
}: {
  params: { assignmentId: string };
}) {
  const [data, setData] = useState<GradingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingSubmissionId, setSavingSubmissionId] = useState<string | null>(
    null,
  );

  const [marksMap, setMarksMap] = useState<Record<string, string>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPanel();
  }, [params.assignmentId]);

  const fetchPanel = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get(
        `/academic/assignments/${params.assignmentId}/grading`,
      );
      const payload = response.data.data as GradingData;
      setData(payload);

      const nextMarks: Record<string, string> = {};
      const nextFeedback: Record<string, string> = {};
      payload.students.forEach((student) => {
        if (student.submission?.id) {
          nextMarks[student.submission.id] =
            student.submission.marksObtained !== null &&
            student.submission.marksObtained !== undefined
              ? String(student.submission.marksObtained)
              : "";
          nextFeedback[student.submission.id] =
            student.submission.feedback || "";
        }
      });
      setMarksMap(nextMarks);
      setFeedbackMap(nextFeedback);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load grading panel");
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (submissionId: string) => {
    try {
      setSavingSubmissionId(submissionId);
      setError("");

      await apiClient.put(
        `/academic/assignments/submissions/${submissionId}/grade`,
        {
          marksObtained: Number(marksMap[submissionId] || 0),
          feedback: feedbackMap[submissionId] || "",
        },
      );

      await fetchPanel();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to grade submission");
    } finally {
      setSavingSubmissionId(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading grading panel...</div>;
  }

  if (!data) {
    return <div className="p-6 text-gray-600">No grading data available.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Teacher Grading Panel
          </h1>
          <p className="text-gray-600 mt-1">
            {data.assignment.title} • {data.assignment.subjectName} (
            {data.assignment.subjectCode})
          </p>
        </div>
        <Link
          href="/dashboard/assignments"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back to Assignments
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Student</th>
              <th className="px-3 py-2 text-left">Admission #</th>
              <th className="px-3 py-2 text-left">Submitted File</th>
              <th className="px-3 py-2 text-left">Submission Text</th>
              <th className="px-3 py-2 text-left">Marks</th>
              <th className="px-3 py-2 text-left">Feedback</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((student) => (
              <tr
                key={student.studentId}
                className="border-t border-gray-100 align-top"
              >
                <td className="px-3 py-2 font-medium text-gray-900">
                  {student.studentName}
                </td>
                <td className="px-3 py-2">{student.admissionNumber}</td>
                <td className="px-3 py-2">
                  {student.submission?.fileUrl ? (
                    <a
                      href={student.submission.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 underline"
                    >
                      Preview file
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-2 max-w-xs whitespace-pre-wrap">
                  {student.submission?.submissionText || "-"}
                </td>
                <td className="px-3 py-2">
                  {student.submission?.id ? (
                    <input
                      title="Marks"
                      type="number"
                      min={0}
                      max={data.assignment.totalMarks}
                      value={marksMap[student.submission.id] || ""}
                      onChange={(e) =>
                        setMarksMap((prev) => ({
                          ...prev,
                          [student.submission!.id]: e.target.value,
                        }))
                      }
                      className="w-24 border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    "Not submitted"
                  )}
                </td>
                <td className="px-3 py-2">
                  {student.submission?.id ? (
                    <textarea
                      title="Feedback"
                      value={feedbackMap[student.submission.id] || ""}
                      onChange={(e) =>
                        setFeedbackMap((prev) => ({
                          ...prev,
                          [student.submission!.id]: e.target.value,
                        }))
                      }
                      className="w-56 border border-gray-300 rounded px-2 py-1"
                      rows={2}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-2">
                  {student.submission?.id ? (
                    <button
                      onClick={() => handleGrade(student.submission!.id)}
                      disabled={savingSubmissionId === student.submission.id}
                      className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {savingSubmissionId === student.submission.id
                        ? "Grading..."
                        : "Grade"}
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
