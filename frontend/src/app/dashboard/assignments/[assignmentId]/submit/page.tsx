"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api";

interface AssignmentDetails {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  fileUrl: string | null;
  allowResubmission: boolean;
  mySubmission: {
    id: string;
    submission_date: string;
    file_url: string | null;
    submission_text: string | null;
    marks_obtained: number | null;
    feedback: string | null;
    status: string;
  } | null;
}

export default function AssignmentSubmissionPage({
  params,
}: {
  params: { assignmentId: string };
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAssignment();
  }, [params.assignmentId]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get(
        `/academic/assignments/${params.assignmentId}`,
      );
      const data = response.data.data;
      setAssignment(data);
      setSubmissionText(data.mySubmission?.submission_text || "");
      setFileUrl(data.mySubmission?.file_url || "");

      if (editorRef.current) {
        editorRef.current.innerHTML = data.mySubmission?.submission_text || "";
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = () => {
    setSubmissionText(editorRef.current?.innerHTML || "");
  };

  const applyFormat = (command: "bold" | "italic" | "underline") => {
    document.execCommand(command);
    handleEditorChange();
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFileUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      await apiClient.post(
        `/academic/assignments/${params.assignmentId}/submit`,
        {
          submissionText,
          fileUrl: fileUrl || null,
        },
      );

      setSuccess("Assignment submitted successfully");
      await fetchAssignment();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading submission page...</div>;
  }

  if (!assignment) {
    return <div className="p-6 text-gray-600">Assignment not found.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Submission Page</h1>
          <p className="text-gray-600 mt-1">{assignment.title}</p>
        </div>
        <Link
          href="/dashboard/assignments/student"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700">
          {success}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
        <p className="text-sm text-gray-700">
          Due Date: {new Date(assignment.dueDate).toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-700">
          Total Marks: {assignment.totalMarks}
        </p>
        <p className="text-sm text-gray-700">
          Resubmission:{" "}
          {assignment.allowResubmission ? "Allowed" : "Not allowed"}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Submission Text Editor
          </label>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => applyFormat("bold")}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
              title="Bold"
            >
              Bold
            </button>
            <button
              type="button"
              onClick={() => applyFormat("italic")}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
              title="Italic"
            >
              Italic
            </button>
            <button
              type="button"
              onClick={() => applyFormat("underline")}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
              title="Underline"
            >
              Underline
            </button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorChange}
            className="min-h-[160px] border border-gray-300 rounded-lg px-3 py-2 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Upload
          </label>
          <input
            id="submissionFile"
            title="Submission File"
            type="file"
            onChange={handleFileUpload}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          {fileUrl && (
            <p className="text-xs text-gray-500 mt-1">File selected</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}
