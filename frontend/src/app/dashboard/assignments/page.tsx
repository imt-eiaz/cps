"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";

interface MetaClass {
  id: string;
  className: string;
  sectionName: string;
}

interface MetaSubject {
  id: string;
  subjectName: string;
  subjectCode: string;
}

interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  fileUrl: string | null;
  status: "active" | "closed" | "archived";
  class: {
    id: string;
    className: string;
    sectionName: string;
  };
  subject: {
    id: string;
    subjectName: string;
    subjectCode: string;
  };
  submissionStatus?: string;
}

const statusChips: Array<{
  value: "" | "active" | "closed" | "archived";
  label: string;
}> = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

function AssignmentsPageContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId") || "";

  const [userRole, setUserRole] = useState<string>("");
  const [classes, setClasses] = useState<MetaClass[]>([]);
  const [subjects, setSubjects] = useState<MetaSubject[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);

  const [classId, setClassId] = useState("");
  const [section, setSection] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "" | "active" | "closed" | "archived"
  >("active");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actingAssignmentId, setActingAssignmentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        setUserRole(parsedUser.roleName || "");
      }
    }
  }, []);

  useEffect(() => {
    loadMetaAndAssignments();
  }, [classId, section, subjectId, statusFilter, studentId]);

  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (classId) params.classId = classId;
    if (section) params.section = section;
    if (subjectId) params.subjectId = subjectId;
    if (statusFilter) params.status = statusFilter;
    if (studentId) params.studentId = studentId;
    return params;
  }, [classId, section, subjectId, statusFilter, studentId]);

  const loadMetaAndAssignments = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const [metaResponse, assignmentResponse] = await Promise.all([
        apiClient.get("/academic/assignments/meta"),
        apiClient.get("/academic/assignments", { params: filterParams }),
      ]);

      setClasses(metaResponse.data.data.classes || []);
      setSubjects(metaResponse.data.data.subjects || []);
      setAssignments(assignmentResponse.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading assignments...</div>;
  }

  const handleStatusChange = async (
    assignmentId: string,
    status: "active" | "closed" | "archived",
  ) => {
    try {
      setActingAssignmentId(assignmentId);
      setError("");
      setSuccess("");
      await apiClient.patch(`/academic/assignments/${assignmentId}/status`, {
        status,
      });
      setSuccess(`Assignment ${status} successfully`);
      await loadMetaAndAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update assignment");
    } finally {
      setActingAssignmentId(null);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    const ok = window.confirm(
      "Are you sure you want to delete this assignment?",
    );
    if (!ok) return;

    try {
      setActingAssignmentId(assignmentId);
      setError("");
      setSuccess("");
      await apiClient.delete(`/academic/assignments/${assignmentId}`);
      setSuccess("Assignment deleted successfully");
      await loadMetaAndAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete assignment");
    } finally {
      setActingAssignmentId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-600 mt-1">
            Teacher assignment list with filters
          </p>
        </div>
        {(userRole === "teacher" || userRole === "admin") && (
          <Link
            href="/dashboard/assignments/create"
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Assignment
          </Link>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Class
          </label>
          <select
            title="Class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.className} - Section {item.sectionName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Section
          </label>
          <input
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. A"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <select
            title="Subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All subjects</option>
            {subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.subjectName} ({item.subjectCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusChips.map((chip) => {
          const active = statusFilter === chip.value;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => setStatusFilter(chip.value)}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              title={`Filter ${chip.label}`}
            >
              {chip.label}
            </button>
          );
        })}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="bg-white border border-gray-200 rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {assignment.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {assignment.subject.subjectName} (
                  {assignment.subject.subjectCode})
                </p>
                <p className="text-sm text-gray-600">
                  {assignment.class.className} - Section{" "}
                  {assignment.class.sectionName}
                </p>
              </div>
              {assignment.submissionStatus && (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">
                  {assignment.submissionStatus}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-700 mt-3 line-clamp-3">
              {assignment.description || "No description"}
            </p>

            <div className="mt-3 text-sm text-gray-600 space-y-1">
              <p>Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
              <p>Total Marks: {assignment.totalMarks}</p>
              <p className="capitalize">
                Assignment Status: {assignment.status}
              </p>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <Link
                href={`/dashboard/assignments/${assignment.id}/grading`}
                className="px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
              >
                Grading Panel
              </Link>
              <Link
                href={`/dashboard/assignments/${assignment.id}/submit`}
                className="px-3 py-1.5 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50"
              >
                Submission Page
              </Link>
              {(userRole === "teacher" || userRole === "admin") && (
                <>
                  <Link
                    href={`/dashboard/assignments/create?assignmentId=${assignment.id}`}
                    className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(assignment.id, "closed")}
                    disabled={actingAssignmentId === assignment.id}
                    className="px-3 py-1.5 text-sm border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 disabled:opacity-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(assignment.id, "archived")
                    }
                    disabled={actingAssignmentId === assignment.id}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(assignment.id)}
                    disabled={actingAssignmentId === assignment.id}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {!error && assignments.length === 0 && (
        <div className="p-6 bg-white border border-gray-200 rounded-xl text-gray-600">
          No assignments found for selected filters.
        </div>
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <AssignmentsPageContent />
    </Suspense>
  );
}
