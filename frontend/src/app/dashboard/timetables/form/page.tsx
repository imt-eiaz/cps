"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import apiClient from "@/lib/api";

interface SubjectOption {
  id: string;
  subjectName: string;
  subjectCode: string;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

interface PeriodFormRow {
  tempId: string;
  dayOfWeek: string;
  subjectId: string;
  teacherId: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
}

interface ClassInfo {
  className: string;
  sectionName?: string;
  classCode: string;
}

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const makeRow = (): PeriodFormRow => ({
  tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  dayOfWeek: "Monday",
  subjectId: "",
  teacherId: "",
  startTime: "",
  endTime: "",
  roomNumber: "",
});

function TimetableFormPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") || "";

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherOption[]>([]);
  const [rowTeachers, setRowTeachers] = useState<
    Record<string, TeacherOption[]>
  >({});
  const [rows, setRows] = useState<PeriodFormRow[]>([makeRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!classId) {
      setError("Missing classId. Please return and select a class.");
      setLoading(false);
      return;
    }

    fetchFormData();
  }, [classId]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const [classRes, subjectRes, teacherRes] = await Promise.all([
        apiClient.get(`/academic/timetables/class/${classId}`),
        apiClient.get("/academic/timetables/meta/subjects"),
        apiClient.get(`/academic/timetables/meta/teachers?classId=${classId}`),
      ]);

      setClassInfo(classRes.data.data?.class || null);
      setSubjects(subjectRes.data.data || []);
      setAllTeachers(teacherRes.data.data || []);

      const existing = classRes.data.data?.periods || [];
      if (existing.length > 0) {
        const mappedRows: PeriodFormRow[] = existing.map((period: any) => ({
          tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dayOfWeek: period.dayOfWeek,
          subjectId: period.subjectId,
          teacherId: period.teacherId,
          startTime: period.startTime,
          endTime: period.endTime,
          roomNumber: period.roomNumber || "",
        }));
        setRows(mappedRows);
      }

      setError("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load timetable form data",
      );
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    setRows((prev) => [...prev, makeRow()]);
  };

  const removeRow = (tempId: string) => {
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((row) => row.tempId !== tempId),
    );
    setRowTeachers((prev) => {
      const next = { ...prev };
      delete next[tempId];
      return next;
    });
  };

  const updateRow = (
    tempId: string,
    field: keyof PeriodFormRow,
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) {
          return row;
        }

        if (field === "subjectId") {
          return { ...row, subjectId: value, teacherId: "" };
        }

        return { ...row, [field]: value };
      }),
    );
  };

  const loadTeachersForRow = async (tempId: string, subjectId: string) => {
    if (!subjectId) {
      setRowTeachers((prev) => ({ ...prev, [tempId]: allTeachers }));
      return;
    }

    try {
      const response = await apiClient.get(
        `/academic/timetables/meta/teachers?classId=${classId}&subjectId=${subjectId}`,
      );
      setRowTeachers((prev) => ({
        ...prev,
        [tempId]: response.data.data || [],
      }));
    } catch {
      setRowTeachers((prev) => ({ ...prev, [tempId]: allTeachers }));
    }
  };

  useEffect(() => {
    rows.forEach((row) => {
      if (!rowTeachers[row.tempId]) {
        setRowTeachers((prev) => ({ ...prev, [row.tempId]: allTeachers }));
      }
    });
  }, [rows, allTeachers]);

  const validate = () => {
    for (const row of rows) {
      if (
        !row.dayOfWeek ||
        !row.subjectId ||
        !row.teacherId ||
        !row.startTime ||
        !row.endTime
      ) {
        setError("Please complete all required fields in each period row");
        return false;
      }

      if (row.startTime >= row.endTime) {
        setError("End time must be later than start time for all periods");
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    setError("");
    if (!validate()) {
      return;
    }

    try {
      setSaving(true);
      await apiClient.put(`/academic/timetables/class/${classId}`, {
        periods: rows.map((row) => ({
          dayOfWeek: row.dayOfWeek,
          subjectId: row.subjectId,
          teacherId: row.teacherId,
          startTime: row.startTime,
          endTime: row.endTime,
          roomNumber: row.roomNumber,
        })),
      });

      setSuccessMessage("Timetable saved successfully");
      setTimeout(() => {
        router.push("/dashboard/timetables");
      }, 900);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save timetable");
    } finally {
      setSaving(false);
    }
  };

  const title = useMemo(() => {
    if (!classInfo) {
      return "Timetable Form";
    }

    return `${classInfo.className}${classInfo.sectionName ? ` - ${classInfo.sectionName}` : ""}`;
  }, [classInfo]);

  return (
    <div className="p-6">
      <div className="mb-8">
        <Link
          href="/dashboard/timetables"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Timetable List
        </Link>
        <h1 className="text-4xl font-bold text-gray-800">Timetable Form</h1>
        <p className="text-gray-600 mt-2">{title}</p>
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

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading timetable form...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Day
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Teacher
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Start Time
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    End Time
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Room
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.tempId} className="border-b border-gray-200">
                    <td className="px-4 py-3">
                      <select
                        title="Select day"
                        value={row.dayOfWeek}
                        onChange={(e) =>
                          updateRow(row.tempId, "dayOfWeek", e.target.value)
                        }
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg"
                      >
                        {days.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        title="Select subject"
                        value={row.subjectId}
                        onChange={async (e) => {
                          const nextSubjectId = e.target.value;
                          updateRow(row.tempId, "subjectId", nextSubjectId);
                          await loadTeachersForRow(row.tempId, nextSubjectId);
                        }}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.subjectName} ({subject.subjectCode})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <select
                        title="Select teacher"
                        value={row.teacherId}
                        onChange={(e) =>
                          updateRow(row.tempId, "teacherId", e.target.value)
                        }
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Teacher</option>
                        {(rowTeachers[row.tempId] || allTeachers).map(
                          (teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.firstName} {teacher.lastName} (
                              {teacher.employeeId})
                            </option>
                          ),
                        )}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <input
                        title="Select start time"
                        type="time"
                        value={row.startTime}
                        onChange={(e) =>
                          updateRow(row.tempId, "startTime", e.target.value)
                        }
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        title="Select end time"
                        type="time"
                        value={row.endTime}
                        onChange={(e) =>
                          updateRow(row.tempId, "endTime", e.target.value)
                        }
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        title="Enter room number"
                        type="text"
                        value={row.roomNumber}
                        onChange={(e) =>
                          updateRow(row.tempId, "roomNumber", e.target.value)
                        }
                        placeholder="Room 101"
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg"
                      />
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeRow(row.tempId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Remove period"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={addRow}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={18} />
              Add Period
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Timetable"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TimetableFormPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <TimetableFormPageContent />
    </Suspense>
  );
}
