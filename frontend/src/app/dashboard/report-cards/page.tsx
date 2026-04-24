"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api";

interface ReportMeta {
  academicYears: Array<{ id: string; yearName: string; isActive: boolean }>;
  classes: Array<{
    id: string;
    className: string;
    sectionName: string;
    classCode: string;
  }>;
  exams: Array<{
    id: string;
    examName: string;
    examType: string;
    startDate: string;
    endDate: string;
    academicYear: string;
  }>;
  terms: string[];
}

export default function ReportCardsPage() {
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [academicYearId, setAcademicYearId] = useState("");
  const [termName, setTermName] = useState("");
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");

  useEffect(() => {
    fetchMeta();
  }, []);

  const fetchMeta = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.get("/academic/report-cards/meta");
      const data = response.data.data as ReportMeta;
      setMeta(data);

      const defaultYear = data.academicYears.find((year) => year.isActive);
      if (defaultYear) {
        setAcademicYearId(defaultYear.id);
      }

      if (data.terms.length > 0) {
        setTermName(data.terms[0]);
      }

      if (data.exams.length > 0) {
        setExamId(data.exams[0].id);
      }

      if (data.classes.length > 0) {
        setClassId(data.classes[0].id);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to load report card generator data",
      );
    } finally {
      setLoading(false);
    }
  };

  const tabulationLink = useMemo(() => {
    if (!examId || !classId) {
      return "/dashboard/report-cards/tabulation";
    }

    const params = new URLSearchParams({
      examId,
      classId,
      termName,
      academicYearId,
    });
    return `/dashboard/report-cards/tabulation?${params.toString()}`;
  }, [academicYearId, classId, examId, termName]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!academicYearId || !termName || !examId || !classId) {
      setError("Please select academic year, term, exam and class");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await apiClient.post("/academic/report-cards/generate", {
        academicYearId,
        termName,
        examId,
        classId,
      });

      setSuccess(
        response.data.message || "Report cards generated successfully",
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to generate report cards",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-600">Loading report card generator...</div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Report Card Generator
          </h1>
          <p className="text-gray-600 mt-1">
            Generate class report cards by academic year, term and exam.
          </p>
        </div>
        <Link
          href={tabulationLink}
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Open Tabulation Sheet
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

      <form
        onSubmit={handleGenerate}
        className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Academic Year
          </label>
          <select
            id="academicYearId"
            title="Academic Year"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          >
            <option value="">Select year</option>
            {meta?.academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.yearName}
                {year.isActive ? " (Active)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Term
          </label>
          <select
            id="termName"
            title="Term"
            value={termName}
            onChange={(e) => setTermName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          >
            <option value="">Select term</option>
            {meta?.terms.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exam
          </label>
          <select
            id="examId"
            title="Exam"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          >
            <option value="">Select exam</option>
            {meta?.exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.examName} ({exam.examType}) - {exam.academicYear}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Class
          </label>
          <select
            id="classId"
            title="Class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          >
            <option value="">Select class</option>
            {meta?.classes.map((schoolClass) => (
              <option key={schoolClass.id} value={schoolClass.id}>
                {schoolClass.className} - Section {schoolClass.sectionName}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Generating..." : "Generate Report Cards"}
          </button>
        </div>
      </form>
    </div>
  );
}
