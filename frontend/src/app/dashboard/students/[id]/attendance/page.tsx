"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Filter,
} from "lucide-react";
import apiClient from "@/lib/api";

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: "present" | "absent" | "late" | "leave";
  remarks?: string;
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

export default function StudentAttendancePage({
  params,
}: {
  params: { id: string };
}) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterApplied, setFilterApplied] = useState(false);

  useEffect(() => {
    fetchStudentInfo();
    fetchAttendance();
  }, [params.id]);

  const fetchStudentInfo = async () => {
    try {
      const response = await apiClient.get(`/academic/students/${params.id}`);
      setStudent({
        id: response.data.data.id,
        firstName: response.data.data.firstName,
        lastName: response.data.data.lastName,
        admissionNumber: response.data.data.admissionNumber,
      });
    } catch (err: any) {
      console.error("Failed to fetch student info:", err);
    }
  };

  const fetchAttendance = async (start?: string, end?: string) => {
    try {
      setLoading(true);
      let url = `/academic/students/${params.id}/attendance`;
      const queryParams = [];

      if (start) queryParams.push(`startDate=${start}`);
      if (end) queryParams.push(`endDate=${end}`);

      if (queryParams.length > 0) {
        url += `?${queryParams.join("&")}`;
      }

      const response = await apiClient.get(url);
      setAttendance(response.data.data || []);
      setError("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch attendance records",
      );
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (startDate || endDate) {
      fetchAttendance(startDate, endDate);
      setFilterApplied(true);
    }
  };

  const clearFilter = () => {
    setStartDate("");
    setEndDate("");
    setFilterApplied(false);
    fetchAttendance();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle size={20} className="text-green-600" />;
      case "absent":
        return <XCircle size={20} className="text-red-600" />;
      case "late":
        return <Clock size={20} className="text-orange-600" />;
      case "leave":
        return <FileText size={20} className="text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
    switch (status) {
      case "present":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "absent":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "late":
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case "leave":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const calculateStats = () => {
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === "present").length;
    const absent = attendance.filter((a) => a.status === "absent").length;
    const late = attendance.filter((a) => a.status === "late").length;
    const leave = attendance.filter((a) => a.status === "leave").length;
    const attendancePercentage =
      total > 0 ? ((present + late) / total) * 100 : 0;

    return {
      total,
      present,
      absent,
      late,
      leave,
      attendancePercentage: attendancePercentage.toFixed(1),
    };
  };

  const stats = calculateStats();

  if (loading && !student) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading attendance records...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/students/${params.id}`}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Student Profile
        </Link>

        {student && (
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              Attendance Records
            </h1>
            <p className="text-gray-600 mt-2">
              {student.firstName} {student.lastName} - {student.admissionNumber}
            </p>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 mb-1">Total Days</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 mb-1">Present</p>
          <p className="text-3xl font-bold text-green-700">{stats.present}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-600 mb-1">Absent</p>
          <p className="text-3xl font-bold text-red-700">{stats.absent}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm text-gray-600 mb-1">Late</p>
          <p className="text-3xl font-bold text-orange-700">{stats.late}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600 mb-1">Attendance</p>
          <p className="text-3xl font-bold text-purple-700">
            {stats.attendancePercentage}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              End Date
            </label>
            <input id="endDate" />
          </div>

          <div className="flex gap-2">
            <button
              onClick={applyFilter}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter size={18} />
              Apply Filter
            </button>

            {filterApplied && (
              <button
                onClick={clearFilter}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Attendance Records
          </h2>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Download size={18} />
            Export
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : error ? (
          <div className="p-8">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          </div>
        ) : attendance.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No attendance records found</p>
            <p className="text-gray-500 text-sm mt-2">
              {filterApplied
                ? "Try adjusting your date range"
                : "Attendance records will appear here once they are marked"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendance.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {formatDate(record.attendance_date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        <span className={getStatusBadge(record.status)}>
                          {record.status.charAt(0).toUpperCase() +
                            record.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {record.remarks || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
