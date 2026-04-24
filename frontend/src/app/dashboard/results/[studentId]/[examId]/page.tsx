"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";
import { StudentResult } from "@/types";
import {
  ArrowLeft,
  Award,
  TrendingUp,
  CheckCircle,
  XCircle,
  Trophy,
  Download,
  BarChart3,
} from "lucide-react";

export default function ResultDetailPage({
  params,
}: {
  params: { studentId: string; examId: string };
}) {
  const router = useRouter();
  const [result, setResult] = useState<StudentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResult();
  }, []);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/academic/marks/student/${params.studentId}/exam/${params.examId}`,
      );
      setResult(response.data.data);
      setError("");
    } catch (error: any) {
      console.error("Failed to fetch result:", error);
      setError(error.response?.data?.message || "Failed to fetch result");
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A"))
      return "text-green-600 bg-green-50 border-green-200";
    if (grade === "B") return "text-blue-600 bg-blue-50 border-blue-200";
    if (grade === "C") return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (grade === "D") return "text-orange-600 bg-orange-50 border-orange-200";
    if (grade === "ABS") return "text-gray-600 bg-gray-50 border-gray-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const formatToTwoDecimals = (value: unknown) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "N/A";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="text-red-700 text-lg">{error || "Result not found"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Results
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {result.exam.name}
            </h1>
            <p className="text-gray-600">
              {result.student.name} • {result.student.admissionNumber} •{" "}
              {result.student.className}
            </p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Download size={20} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <TrendingUp className="mb-2" size={28} />
          <p className="text-sm opacity-90">Overall Percentage</p>
          <p className="text-4xl font-bold">
            {formatToTwoDecimals(result.percentage)}%
          </p>
          <p className="text-xs opacity-75 mt-2">
            {result.totalObtained} / {result.totalMax} marks
          </p>
        </div>

        <div
          className={`bg-gradient-to-br ${result.passed ? "from-green-500 to-green-600" : "from-red-500 to-red-600"} rounded-lg shadow-lg p-6 text-white`}
        >
          {result.passed ? (
            <CheckCircle className="mb-2" size={28} />
          ) : (
            <XCircle className="mb-2" size={28} />
          )}
          <p className="text-sm opacity-90">Result Status</p>
          <p className="text-4xl font-bold">
            {result.passed ? "Pass" : "Fail"}
          </p>
          {result.passFailReason && (
            <p className="text-xs opacity-75 mt-2">{result.passFailReason}</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <Award className="mb-2" size={28} />
          <p className="text-sm opacity-90">Overall Grade</p>
          <p className="text-4xl font-bold">{result.overallGrade}</p>
          <p className="text-xs opacity-75 mt-2">
            GPA: {formatToTwoDecimals(result.overallGPA)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <Trophy className="mb-2" size={28} />
          <p className="text-sm opacity-90">Class Rank</p>
          <p className="text-4xl font-bold">#{result.rank || "N/A"}</p>
          <p className="text-xs opacity-75 mt-2">Out of class</p>
        </div>
      </div>

      {/* Subject-wise Marks Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-600" />
            Subject-wise Performance
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Marks Obtained
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Max Marks
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                  GPA
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {result.subjects.map((subject, index) => (
                <tr
                  key={subject.subjectId}
                  className={`hover:bg-gray-50 ${subject.isAbsent ? "bg-red-25" : ""}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-800">
                        {subject.subjectName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {subject.isAbsent ? (
                      <span className="text-gray-400 font-medium">ABS</span>
                    ) : (
                      <span className="font-semibold text-gray-800">
                        {subject.marksObtained}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">
                    {subject.maxMarks}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {formatToTwoDecimals(subject.percentage)}%
                      </span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            subject.percentage >= 90
                              ? "bg-green-500"
                              : subject.percentage >= 70
                                ? "bg-blue-500"
                                : subject.percentage >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(subject.percentage, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full font-semibold text-sm border ${getGradeColor(subject.grade)}`}
                    >
                      {subject.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-gray-800">
                    {formatToTwoDecimals(subject.gpa)}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {subject.remarks || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr className="font-bold">
                <td className="px-6 py-4 text-gray-800">TOTAL</td>
                <td className="px-6 py-4 text-center text-gray-800">
                  {result.totalObtained}
                </td>
                <td className="px-6 py-4 text-center text-gray-800">
                  {result.totalMax}
                </td>
                <td className="px-6 py-4 text-center text-blue-600">
                  {formatToTwoDecimals(result.percentage)}%
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-block px-4 py-2 rounded-full font-bold text-lg border-2 ${getGradeColor(result.overallGrade)}`}
                  >
                    {result.overallGrade}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-purple-600">
                  {formatToTwoDecimals(result.overallGPA)}
                </td>
                <td className="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Grading Scale Reference */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Grading Scale
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { grade: "A+", range: "90-100", gpa: "4.0", color: "green" },
            { grade: "A", range: "80-89", gpa: "3.7", color: "green" },
            { grade: "B", range: "70-79", gpa: "3.3", color: "blue" },
            { grade: "C", range: "60-69", gpa: "3.0", color: "yellow" },
            { grade: "D", range: "50-59", gpa: "2.0", color: "orange" },
            { grade: "F", range: "0-49", gpa: "0.0", color: "red" },
          ].map((item) => (
            <div
              key={item.grade}
              className={`p-4 rounded-lg text-center border-2 bg-${item.color}-50 border-${item.color}-200`}
            >
              <p className={`text-2xl font-bold text-${item.color}-600 mb-1`}>
                {item.grade}
              </p>
              <p className="text-sm text-gray-600">{item.range}%</p>
              <p className="text-xs text-gray-500 mt-1">GPA: {item.gpa}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
