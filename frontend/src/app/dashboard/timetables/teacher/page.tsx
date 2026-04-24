"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import apiClient from "@/lib/api";

interface TeacherPeriod {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  className: string;
  sectionName?: string;
  subjectName: string;
}

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TeacherTimetablePage() {
  const [periods, setPeriods] = useState<TeacherPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/academic/timetables/teacher/me");
      setPeriods(response.data.data?.periods || []);
      setError("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load teacher timetable",
      );
    } finally {
      setLoading(false);
    }
  };

  const periodColumns = useMemo(() => {
    const values = Array.from(
      new Set(periods.map((p) => `${p.startTime}-${p.endTime}`)),
    );
    return values.sort((a, b) => a.localeCompare(b));
  }, [periods]);

  const lookup = useMemo(() => {
    const map: Record<string, TeacherPeriod> = {};
    periods.forEach((period) => {
      map[`${period.dayOfWeek}__${period.startTime}-${period.endTime}`] =
        period;
    });
    return map;
  }, [periods]);

  return (
    <div className="p-6">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold text-gray-800">Teacher Timetable</h1>
        <p className="text-gray-600 mt-2">Weekly class schedule</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading timetable...</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Day
                </th>
                {periodColumns.map((column, index) => (
                  <th
                    key={column}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700"
                  >
                    Period {index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day} className="border-b border-gray-200 align-top">
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {day}
                  </td>
                  {periodColumns.length > 0 ? (
                    periodColumns.map((column) => {
                      const period = lookup[`${day}__${column}`];
                      return (
                        <td key={`${day}-${column}`} className="px-6 py-4">
                          {period ? (
                            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm space-y-1">
                              <p className="font-semibold text-gray-900">
                                {period.subjectName}
                              </p>
                              <p className="text-gray-700">
                                {period.className}
                                {period.sectionName
                                  ? ` - ${period.sectionName}`
                                  : ""}
                              </p>
                              <p className="text-gray-600">
                                {period.startTime} - {period.endTime}
                              </p>
                              <p className="text-gray-600">
                                Room: {period.roomNumber || "—"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      );
                    })
                  ) : (
                    <td className="px-6 py-4 text-gray-500">
                      No periods configured
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
