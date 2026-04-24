"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api";
import {
  Users,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
  CheckCircle,
  BarChart3,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  activeEnrollments: number;
  attendance: {
    today: {
      present: number;
      absent: number;
      late: number;
      total: number;
    };
    week: {
      present: number;
      absent: number;
      total: number;
    };
  };
  finance: {
    pendingInvoices: number;
    totalPending: number;
    totalCollected: number;
    totalAmount: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    activeEnrollments: 0,
    attendance: {
      today: { present: 0, absent: 0, late: 0, total: 0 },
      week: { present: 0, absent: 0, total: 0 },
    },
    finance: {
      pendingInvoices: 0,
      totalPending: 0,
      totalCollected: 0,
      totalAmount: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      // Only fetch admin stats if user is admin
      if (!user) {
        console.log("Dashboard: No user yet, waiting...");
        return;
      }

      console.log("Dashboard: User loaded:", {
        name: `${user.firstName} ${user.lastName}`,
        role: user.roleName,
      });

      if (user.roleName === "admin") {
        try {
          console.log("Dashboard: Fetching admin statistics...");
          const response = await apiClient.get("/admin/dashboard");
          console.log("Dashboard: Stats received:", response.data.data);
          setStats(response.data.data);
          setError("");
          console.log("Dashboard: Stats updated successfully");
        } catch (error: any) {
          console.error("Dashboard: Failed to fetch stats:", error);
          setError(error.response?.data?.message || "Failed to fetch stats");
        } finally {
          setLoading(false);
        }
      } else {
        console.log("Dashboard: User is not admin, showing quick links");
        // For non-admin users, just stop loading
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
    }).format(amount);
  };

  const getAttendanceRate = () => {
    if (stats.attendance.today.total === 0) return 0;
    return Math.round(
      (stats.attendance.today.present / stats.attendance.today.total) * 100,
    );
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8">
        Dashboard
        {user && (
          <span className="text-sm font-normal text-gray-600 ml-3">
            Welcome, {user.firstName} {user.lastName} ({user.roleName})
          </span>
        )}
      </h2>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : user?.roleName === "admin" ? (
        // Admin Dashboard
        <>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Students */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <GraduationCap size={28} />
                </div>
                <TrendingUp size={20} className="opacity-75" />
              </div>
              <p className="text-sm opacity-90 mb-1">Total Students</p>
              <p className="text-4xl font-bold">{stats.totalStudents}</p>
              <p className="text-xs opacity-75 mt-2">
                Active enrollments: {stats.activeEnrollments}
              </p>
            </div>

            {/* Teachers */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <Users size={28} />
                </div>
                <TrendingUp size={20} className="opacity-75" />
              </div>
              <p className="text-sm opacity-90 mb-1">Total Teachers</p>
              <p className="text-4xl font-bold">{stats.totalTeachers}</p>
              <p className="text-xs opacity-75 mt-2">Active faculty members</p>
            </div>

            {/* Classes */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <BookOpen size={28} />
                </div>
                <TrendingUp size={20} className="opacity-75" />
              </div>
              <p className="text-sm opacity-90 mb-1">Total Classes</p>
              <p className="text-4xl font-bold">{stats.totalClasses}</p>
              <p className="text-xs opacity-75 mt-2">Across all departments</p>
            </div>

            {/* Amount Pending */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <DollarSign size={28} />
                </div>
                <AlertCircle size={20} className="opacity-75" />
              </div>
              <p className="text-sm opacity-90 mb-1">Amount Pending</p>
              <p className="text-4xl font-bold">
                {formatCurrency(stats.finance.totalPending)}
              </p>
              <p className="text-xs opacity-75 mt-2">
                {stats.finance.pendingInvoices} pending invoices
              </p>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Today's Attendance */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <ClipboardCheck className="text-blue-600" size={24} />
                  Today's Attendance
                </h3>
                <span className="text-2xl font-bold text-blue-600">
                  {getAttendanceRate()}%
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 p-2 rounded-lg">
                      <UserCheck size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Present</p>
                      <p className="text-2xl font-bold text-green-700">
                        {stats.attendance.today.present}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500 p-2 rounded-lg">
                      <UserX size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Absent</p>
                      <p className="text-2xl font-bold text-red-700">
                        {stats.attendance.today.absent}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500 p-2 rounded-lg">
                      <Clock size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Late</p>
                      <p className="text-2xl font-bold text-orange-700">
                        {stats.attendance.today.late}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600">
                    Total Records Today:{" "}
                    <span className="font-bold text-gray-800">
                      {stats.attendance.today.total}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <DollarSign className="text-green-600" size={24} />
                  Financial Overview
                </h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-l-4 border-green-500">
                  <p className="text-sm text-gray-600 mb-1">Total Collected</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(stats.finance.totalCollected)}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border-l-4 border-orange-500">
                  <p className="text-sm text-gray-600 mb-1">Pending Amount</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {formatCurrency(stats.finance.totalPending)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.finance.pendingInvoices} invoices pending
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(stats.finance.totalAmount)}
                  </p>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Collection Rate:</span>
                    <span className="font-bold text-gray-800">
                      {stats.finance.totalAmount > 0
                        ? Math.round(
                            (stats.finance.totalCollected /
                              stats.finance.totalAmount) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Attendance Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={24} />
              This Week's Attendance Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Total Present</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.attendance.week.present}
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Total Absent</p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.attendance.week.absent}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Weekly Rate</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.attendance.week.total > 0
                    ? Math.round(
                        (stats.attendance.week.present /
                          stats.attendance.week.total) *
                          100,
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Non-Admin Dashboard
        <div className="bg-white rounded-lg shadow p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Welcome to School Management System
          </h3>
          <p className="text-gray-600 mb-6">
            Use the navigation menu to access your available features.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user?.roleName === "student" && (
              <>
                <a
                  href="/dashboard/classes"
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <BookOpen className="text-blue-600 mb-2" size={24} />
                  <h4 className="font-semibold text-gray-800">My Classes</h4>
                  <p className="text-sm text-gray-600">View your classes</p>
                </a>
                <a
                  href="/dashboard/attendance"
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <BarChart3 className="text-green-600 mb-2" size={24} />
                  <h4 className="font-semibold text-gray-800">Attendance</h4>
                  <p className="text-sm text-gray-600">Check attendance</p>
                </a>
              </>
            )}
            {user?.roleName === "teacher" && (
              <>
                <a
                  href="/dashboard/classes"
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <BookOpen className="text-blue-600 mb-2" size={24} />
                  <h4 className="font-semibold text-gray-800">Classes</h4>
                  <p className="text-sm text-gray-600">Manage classes</p>
                </a>
                <a
                  href="/dashboard/attendance"
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <BarChart3 className="text-green-600 mb-2" size={24} />
                  <h4 className="font-semibold text-gray-800">
                    Mark Attendance
                  </h4>
                  <p className="text-sm text-gray-600">Take daily attendance</p>
                </a>
                <a
                  href="/dashboard/students"
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <Users className="text-purple-600 mb-2" size={24} />
                  <h4 className="font-semibold text-gray-800">Students</h4>
                  <p className="text-sm text-gray-600">View students</p>
                </a>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Activity
          </h3>
          <div className="text-gray-600 text-center py-8">
            No recent activity
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="w-full text-left p-3 hover:bg-gray-50 rounded">
              Add New Student
            </button>
            <button className="w-full text-left p-3 hover:bg-gray-50 rounded">
              Add New Teacher
            </button>
            <button className="w-full text-left p-3 hover:bg-gray-50 rounded">
              Create New Class
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
