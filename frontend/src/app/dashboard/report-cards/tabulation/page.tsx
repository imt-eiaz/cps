"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";

interface ReportMeta {
  classes: Array<{ id: string; className: string; sectionName: string }>;
  exams: Array<{ id: string; examName: string; examType: string }>;
}

interface TabulationData {
  school: { name: string | null; logoUrl: string | null };
  class: {
    id: string;
    className: string;
    sectionName: string;
    academicYear: string;
  };
  exam: { id: string; exam_name: string; exam_type: string };
  subjects: Array<{ id: string; name: string; code: string }>;
  rows: Array<{
    studentId: string;
    studentName: string;
    admissionNumber: string;
    subjects: Record<
      string,
      {
        marksObtained: number;
        maxMarks: number;
        grade: string;
        gpa: number;
        percentage: number;
        isAbsent: boolean;
      }
    >;
    totalObtained: number;
    totalMax: number;
    percentage: number;
    gpa: number;
    grade: string;
    rank: number;
  }>;
}

function TabulationSheetPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState<TabulationData | null>(null);

  const [examId, setExamId] = useState(searchParams.get("examId") || "");
  const [classId, setClassId] = useState(searchParams.get("classId") || "");

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    if (examId && classId) {
      fetchSheet(examId, classId);
    }
  }, [examId, classId]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (examId) params.set("examId", examId);
    if (classId) params.set("classId", classId);
    return params.toString();
  }, [classId, examId]);

  const fetchMeta = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.get("/academic/report-cards/meta");
      const data = response.data.data;
      setMeta({
        classes: data.classes,
        exams: data.exams,
      });

      if (!examId && data.exams.length > 0) {
        setExamId(data.exams[0].id);
      }
      if (!classId && data.classes.length > 0) {
        setClassId(data.classes[0].id);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load tabulation metadata",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSheet = async (
    selectedExamId: string,
    selectedClassId: string,
  ) => {
    if (!selectedExamId || !selectedClassId) {
      return;
    }

    try {
      setSheetLoading(true);
      setError("");

      const response = await apiClient.get(
        "/academic/report-cards/tabulation",
        {
          params: {
            examId: selectedExamId,
            classId: selectedClassId,
          },
        },
      );
      setSheet(response.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load tabulation sheet",
      );
      setSheet(null);
    } finally {
      setSheetLoading(false);
    }
  };

  const applyFilters = () => {
    const target = queryString
      ? `/dashboard/report-cards/tabulation?${queryString}`
      : "/dashboard/report-cards/tabulation";
    router.replace(target);
    fetchSheet(examId, classId);
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading tabulation sheet...</div>;
  }

  return (
    <div className="p-6 max-w-[98%] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tabulation Sheet</h1>
        <p className="text-gray-600 mt-1">
          Class-wise consolidated marks, GPA, grade and rank.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exam
          </label>
          <select
            title="Exam"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Select exam</option>
            {meta?.exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.examName} ({exam.examType})
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
          >
            <option value="">Select class</option>
            {meta?.classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.className} - Section {schoolClass.sectionName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={applyFilters}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Load Sheet
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {sheetLoading && <div className="text-gray-600">Loading data...</div>}

      {!sheetLoading && sheet && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {sheet.class.className} - Section {sheet.class.sectionName}
            </h2>
            <p className="text-sm text-gray-600">
              Exam: {sheet.exam.exam_name} ({sheet.exam.exam_type})
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Rank
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Student
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Adm #
                  </th>
                  {sheet.subjects.map((subject) => (
                    <th
                      key={subject.id}
                      className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
                    >
                      {subject.name} ({subject.code})
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Total
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    %
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    GPA
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row) => (
                  <tr key={row.studentId} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.rank}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {row.studentName}
                    </td>
                    <td className="px-3 py-2">{row.admissionNumber}</td>
                    {sheet.subjects.map((subject) => {
                      const subjectMark = row.subjects[subject.id];
                      return (
                        <td
                          key={subject.id}
                          className="px-3 py-2 whitespace-nowrap"
                        >
                          {subjectMark
                            ? `${subjectMark.marksObtained}/${subjectMark.maxMarks}`
                            : "-"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.totalObtained}/{row.totalMax}
                    </td>
                    <td className="px-3 py-2">{row.percentage}%</td>
                    <td className="px-3 py-2">{row.gpa}</td>
                    <td className="px-3 py-2 font-semibold">{row.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TabulationSheetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <TabulationSheetPageContent />
    </Suspense>
  );
}
