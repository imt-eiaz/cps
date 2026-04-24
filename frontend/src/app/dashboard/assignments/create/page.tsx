"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function CreateAssignmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assignmentId") || "";
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [classes, setClasses] = useState<MetaClass[]>([]);
  const [subjects, setSubjects] = useState<MetaSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [section, setSection] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalMarks, setTotalMarks] = useState("10");
  const [fileUrl, setFileUrl] = useState("");
  const [allowResubmission, setAllowResubmission] = useState(false);

  useEffect(() => {
    loadMeta();
  }, [assignmentId]);

  useEffect(() => {
    if (!classId) return;
    const selectedClass = classes.find((item) => item.id === classId);
    if (selectedClass) {
      setSection(selectedClass.sectionName || "");
    }
  }, [classId, classes]);

  const loadMeta = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.get("/academic/assignments/meta");
      const data = response.data.data;
      setClasses(data.classes || []);
      setSubjects(data.subjects || []);

      if ((data.classes || []).length > 0) {
        setClassId(data.classes[0].id);
        setSection(data.classes[0].sectionName || "");
      }

      if ((data.subjects || []).length > 0) {
        setSubjectId(data.subjects[0].id);
      }

      if (assignmentId) {
        const assignmentResponse = await apiClient.get(
          `/academic/assignments/${assignmentId}`,
        );
        const assignment = assignmentResponse.data.data;

        setTitle(assignment.title || "");
        setDescription(assignment.description || "");
        setSubjectId(assignment.subject?.id || "");
        setClassId(assignment.class?.id || "");
        setSection(assignment.class?.sectionName || "");
        setDueDate(
          assignment.dueDate
            ? new Date(assignment.dueDate).toISOString().slice(0, 10)
            : "",
        );
        setTotalMarks(String(assignment.totalMarks || 10));
        setFileUrl(assignment.fileUrl || "");
        setAllowResubmission(Boolean(assignment.allowResubmission));

        if (editorRef.current) {
          editorRef.current.innerHTML = assignment.description || "";
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = () => {
    setDescription(editorRef.current?.innerHTML || "");
  };

  const applyFormat = (command: "bold" | "italic" | "underline") => {
    document.execCommand(command);
    handleEditorChange();
  };

  const handleAttachmentUpload = async (
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

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title || !subjectId || !classId || !dueDate) {
      setError("Title, subject, class and due date are required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        title,
        description,
        subjectId,
        classId,
        section,
        dueDate,
        totalMarks: Number(totalMarks || 10),
        fileUrl: fileUrl || null,
        allowResubmission,
      };

      if (assignmentId) {
        await apiClient.put(`/academic/assignments/${assignmentId}`, payload);
      } else {
        await apiClient.post("/academic/assignments", payload);
      }

      router.push("/dashboard/assignments");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          (assignmentId
            ? "Failed to update assignment"
            : "Failed to create assignment"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading create form...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {assignmentId ? "Edit Assignment" : "Create Assignment"}
        </h1>
        <p className="text-gray-600 mt-1">
          {assignmentId
            ? "Update homework details for this assignment"
            : "Add homework for a class and subject"}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            id="title"
            title="Title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Rich Text)
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
            className="min-h-[130px] border border-gray-300 rounded-lg px-3 py-2 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              title="Subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            >
              <option value="">Select subject</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subjectName} ({item.subjectCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class
            </label>
            <select
              title="Class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            >
              <option value="">Select class</option>
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
              id="section"
              title="Section"
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              id="dueDate"
              title="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Marks
            </label>
            <input
              id="totalMarks"
              title="Total Marks"
              type="number"
              min={1}
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attachment Upload
          </label>
          <input
            id="attachmentUpload"
            title="Attachment Upload"
            type="file"
            onChange={handleAttachmentUpload}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          {fileUrl && (
            <p className="text-xs text-gray-500 mt-1">Attachment loaded</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="allowResubmission"
            type="checkbox"
            checked={allowResubmission}
            onChange={(e) => setAllowResubmission(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="allowResubmission" className="text-sm text-gray-700">
            Allow resubmission
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/assignments")}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting
              ? assignmentId
                ? "Updating..."
                : "Creating..."
              : assignmentId
                ? "Update Assignment"
                : "Create Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateAssignmentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <CreateAssignmentForm />
    </Suspense>
  );
}
