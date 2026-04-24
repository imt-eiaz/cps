"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import apiClient from "@/lib/api";

interface ClassOption {
  id: string;
  className: string;
  sectionName?: string;
  classCode: string;
}

interface TimetablePeriod {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  subjectName: string;
  teacherName: string;
}

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TimetableManagementPage() {
  const router = useRouter();
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedSectionName, setSelectedSectionName] = useState("");
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchClassOptions();
  }, []);

  const fetchClassOptions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/academic/timetables/meta/classes");
      setClassOptions(response.data.data || []);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const classNames = useMemo(
    () => Array.from(new Set(classOptions.map((item) => item.className))),
    [classOptions],
  );

  const sectionsForClass = useMemo(
    () =>
      classOptions
        .filter((item) => item.className === selectedClassName)
        .map((item) => item.sectionName || "")
        .filter((value, index, arr) => arr.indexOf(value) === index),
    [classOptions, selectedClassName],
  );

  const selectedClass = useMemo(
    () =>
      classOptions.find(
        (item) =>
          item.className === selectedClassName &&
          (item.sectionName || "") === selectedSectionName,
      ) || null,
    [classOptions, selectedClassName, selectedSectionName],
  );

  const fetchClassTimetable = async (classId: string) => {
    try {
      const response = await apiClient.get(
        `/academic/timetables/class/${classId}`,
      );
      setPeriods(response.data.data?.periods || []);
      setError("");
    } catch (err: any) {
      setPeriods([]);
      setError(err.response?.data?.message || "Failed to load timetable");
    }
  };

  useEffect(() => {
    if (selectedClass?.id) {
      fetchClassTimetable(selectedClass.id);
    } else {
      setPeriods([]);
    }
  }, [selectedClass?.id]);

  const periodColumns = useMemo(() => {
    const values = Array.from(
      new Set(periods.map((p) => `${p.startTime}-${p.endTime}`)),
    );
    return values.sort((a, b) => a.localeCompare(b));
  }, [periods]);

  const gridLookup = useMemo(() => {
    const map: Record<string, TimetablePeriod> = {};
    periods.forEach((period) => {
      map[`${period.dayOfWeek}__${period.startTime}-${period.endTime}`] =
        period;
    });
    return map;
  }, [periods]);

  const onGenerateEdit = () => {
    if (!selectedClass?.id) {
      setError("Please select class and section");
      return;
    }

    router.push(`/dashboard/timetables/form?classId=${selectedClass.id}`);
  };

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
        <h1 className="text-4xl font-bold text-gray-800">
          Timetable Management
        </h1>
        <p className="text-gray-600 mt-2">
          Generate and manage class weekly timetables
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Class
          </label>
          <select
            title="Select Class"
            value={selectedClassName}
            onChange={(e) => {
              setSelectedClassName(e.target.value);
              setSelectedSectionName("");
              setPeriods([]);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Class</option>
            {classNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Section
          </label>
          <select
            title="Select Section"
            value={selectedSectionName}
            onChange={(e) => setSelectedSectionName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Section</option>
            {sectionsForClass.map((section) => (
              <option key={section || "NO_SECTION"} value={section}>
                {section || "No Section"}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <button
            onClick={onGenerateEdit}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <CalendarClock size={18} />
            Generate / Edit Timetable
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading timetable module...</p>
        </div>
      ) : selectedClass ? (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Day
                </th>
                {periodColumns.length > 0 ? (
                  periodColumns.map((column, index) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-sm font-semibold text-gray-700"
                    >
                      Period {index + 1}
                    </th>
                  ))
                ) : (
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Periods
                  </th>
                )}
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
                      const period = gridLookup[`${day}__${column}`];
                      return (
                        <td key={`${day}-${column}`} className="px-6 py-4">
                          {period ? (
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm space-y-1">
                              <p className="font-semibold text-gray-900">
                                {period.subjectName}
                              </p>
                              <p className="text-gray-700">
                                {period.teacherName}
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
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 text-gray-600">
          Select class and section to view timetable grid
        </div>
      )}
    </div>
  );
}
