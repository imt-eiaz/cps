"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";

interface ReportCardData {
  school: {
    name: string | null;
    logoUrl: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
    admissionDate: string;
    dateOfBirth: string;
    gender: string;
    email: string;
    phone: string;
    address: string;
    className: string;
    sectionName: string;
    photoUrl: string | null;
  };
  exam: {
    id: string;
    examName: string;
    examType: string;
    startDate: string;
    endDate: string;
  } | null;
  academicYear: {
    id: string;
    yearName: string;
  } | null;
  termName: string;
  subjects: Array<{
    subjectName: string;
    subjectCode: string;
    marksObtained: number;
    maxMarks: number;
    percentage: number;
    grade: string;
    gpa: number;
    isAbsent: boolean;
    remarks: string;
  }>;
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    percentage: number;
  };
  summary: {
    totalObtained: number;
    totalMax: number;
    percentage: number;
    gpa: number;
    grade: string;
    remarks: string;
  };
  signatures: {
    classTeacherName: string | null;
    classTeacherSignatureUrl: string | null;
    principalName: string | null;
    principalSignatureUrl: string | null;
  };
}

interface ReportMeta {
  exams: Array<{
    id: string;
    examName: string;
    examType: string;
  }>;
  terms: string[];
}

function StudentReportCardPageContent({
  params,
}: {
  params: { studentId: string };
}) {
  const searchParams = useSearchParams();

  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [examId, setExamId] = useState(searchParams.get("examId") || "");
  const [termName, setTermName] = useState(searchParams.get("termName") || "");

  useEffect(() => {
    initializePage();
  }, [params.studentId]);

  const initializePage = async () => {
    try {
      setLoading(true);
      setError("");

      const [metaResponse] = await Promise.all([
        apiClient.get("/academic/report-cards/meta"),
      ]);

      const metaData = metaResponse.data.data;
      setMeta({
        exams: metaData.exams,
        terms: metaData.terms,
      });

      const resolvedExamId = examId || metaData.exams[0]?.id || "";
      const resolvedTermName = termName || metaData.terms[0] || "Term 1";

      setExamId(resolvedExamId);
      setTermName(resolvedTermName);

      await fetchReportCard(resolvedExamId, resolvedTermName);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load report card metadata",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchReportCard = async (
    selectedExamId: string,
    selectedTermName: string,
  ) => {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.get(
        `/academic/report-cards/student/${params.studentId}`,
        {
          params: {
            examId: selectedExamId || undefined,
            termName: selectedTermName || undefined,
          },
        },
      );

      setReportCard(response.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load student report card",
      );
      setReportCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async () => {
    await fetchReportCard(examId, termName);
  };

  if (loading && !reportCard) {
    return (
      <div className="p-6 text-gray-600">Loading student report card...</div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Student Report Card
          </h1>
          <p className="text-gray-600 mt-1">
            Detailed exam and performance sheet
          </p>
        </div>
        <Link
          href={`/dashboard/students/${params.studentId}`}
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back to Student Profile
        </Link>
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
            <option value="">Latest exam</option>
            {meta?.exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.examName} ({exam.examType})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Term
          </label>
          <select
            title="Term"
            value={termName}
            onChange={(e) => setTermName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Select term</option>
            {meta?.terms.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleLoad}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Load Report Card
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {reportCard && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-4">
              {reportCard.school.logoUrl ? (
                <img
                  src={reportCard.school.logoUrl}
                  alt="School logo"
                  className="w-16 h-16 rounded-full border border-gray-200 object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                  Logo
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {reportCard.school.name || "School"}
                </h2>
                <p className="text-sm text-gray-600">
                  {reportCard.school.address || ""}
                </p>
                <p className="text-sm text-gray-600">
                  {reportCard.school.phone || ""}{" "}
                  {reportCard.school.email || ""}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-700">
              <p>
                <span className="font-medium">Academic Year:</span>{" "}
                {reportCard.academicYear?.yearName || "N/A"}
              </p>
              <p>
                <span className="font-medium">Term:</span> {reportCard.termName}
              </p>
              <p>
                <span className="font-medium">Exam:</span>{" "}
                {reportCard.exam
                  ? `${reportCard.exam.examName} (${reportCard.exam.examType})`
                  : "N/A"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p>
                <span className="font-medium">Student Name:</span>{" "}
                {reportCard.student.fullName}
              </p>
              <p>
                <span className="font-medium">Admission No:</span>{" "}
                {reportCard.student.admissionNumber}
              </p>
              <p>
                <span className="font-medium">Class:</span>{" "}
                {reportCard.student.className} - Section{" "}
                {reportCard.student.sectionName}
              </p>
              <p>
                <span className="font-medium">Gender:</span>{" "}
                {reportCard.student.gender || "N/A"}
              </p>
              <p>
                <span className="font-medium">Date of Birth:</span>{" "}
                {reportCard.student.dateOfBirth
                  ? new Date(
                      reportCard.student.dateOfBirth,
                    ).toLocaleDateString()
                  : "N/A"}
              </p>
              <p>
                <span className="font-medium">Email:</span>{" "}
                {reportCard.student.email || "N/A"}
              </p>
            </div>
            <div>
              {reportCard.student.photoUrl ? (
                <img
                  src={reportCard.student.photoUrl}
                  alt="Student"
                  className="w-28 h-32 border border-gray-200 rounded object-cover"
                />
              ) : (
                <div className="w-28 h-32 border border-gray-200 rounded bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                  Student Photo
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Subject</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Marks</th>
                  <th className="px-3 py-2 text-left">%</th>
                  <th className="px-3 py-2 text-left">GPA</th>
                  <th className="px-3 py-2 text-left">Grade</th>
                  <th className="px-3 py-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {reportCard.subjects.map((subject, index) => (
                  <tr
                    key={`${subject.subjectCode}-${index}`}
                    className="border-t border-gray-100"
                  >
                    <td className="px-3 py-2">{subject.subjectName}</td>
                    <td className="px-3 py-2">{subject.subjectCode}</td>
                    <td className="px-3 py-2">
                      {subject.isAbsent
                        ? "Absent"
                        : `${subject.marksObtained}/${subject.maxMarks}`}
                    </td>
                    <td className="px-3 py-2">{subject.percentage}</td>
                    <td className="px-3 py-2">{subject.gpa}</td>
                    <td className="px-3 py-2 font-semibold">{subject.grade}</td>
                    <td className="px-3 py-2">{subject.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Attendance Summary
              </h3>
              <p className="text-sm text-gray-700">
                Total Days: {reportCard.attendance.totalDays}
              </p>
              <p className="text-sm text-gray-700">
                Present Days: {reportCard.attendance.presentDays}
              </p>
              <p className="text-sm text-gray-700">
                Absent Days: {reportCard.attendance.absentDays}
              </p>
              <p className="text-sm text-gray-700">
                Late Days: {reportCard.attendance.lateDays}
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                Attendance %: {reportCard.attendance.percentage}
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Result Summary
              </h3>
              <p className="text-sm text-gray-700">
                Total Marks: {reportCard.summary.totalObtained}/
                {reportCard.summary.totalMax}
              </p>
              <p className="text-sm text-gray-700">
                Percentage: {reportCard.summary.percentage}%
              </p>
              <p className="text-sm text-gray-700">
                GPA: {reportCard.summary.gpa}
              </p>
              <p className="text-sm text-gray-700">
                Grade: {reportCard.summary.grade}
              </p>
              <p className="text-sm text-gray-700">
                Remarks: {reportCard.summary.remarks}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div>
              <div className="h-12 border-b border-gray-400 mb-2" />
              <p className="text-sm text-gray-700 font-medium">
                Class Teacher Signature
              </p>
              <p className="text-sm text-gray-600">
                {reportCard.signatures.classTeacherName || "Class Teacher"}
              </p>
            </div>
            <div>
              <div className="h-12 border-b border-gray-400 mb-2" />
              <p className="text-sm text-gray-700 font-medium">
                Principal Signature
              </p>
              <p className="text-sm text-gray-600">
                {reportCard.signatures.principalName || "Principal"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentReportCardPage({
  params,
}: {
  params: { studentId: string };
}) {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading...</div>}>
      <StudentReportCardPageContent params={params} />
    </Suspense>
  );
}
