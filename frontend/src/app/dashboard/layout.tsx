"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  LogOut,
  Home,
  Users,
  BookOpen,
  CreditCard,
  Settings,
  ClipboardCheck,
  UserPlus,
  FileText,
  Calendar,
  GraduationCap,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const menuItems = [
    { label: "Dashboard", icon: Home, href: "/dashboard" },
    { label: "Students", icon: Users, href: "/dashboard/students" },
    { label: "Teachers", icon: Users, href: "/dashboard/teachers" },
    { label: "Classes", icon: BookOpen, href: "/dashboard/classes" },
    { label: "Subjects", icon: BookOpen, href: "/dashboard/subjects" },
    { label: "Timetables", icon: BookOpen, href: "/dashboard/timetables" },
    { label: "Exams", icon: Calendar, href: "/dashboard/exams" },
    {
      label: "Enrollments",
      icon: UserPlus,
      href: "/dashboard/enrollments",
    },
    {
      label: "Attendance",
      icon: ClipboardCheck,
      href: "/dashboard/attendance",
    },
    {
      label: "Results",
      icon: FileText,
      href: "/dashboard/results",
    },
    {
      label: "Assignments",
      icon: FileText,
      href: "/dashboard/assignments",
    },
    {
      label: "Report Cards",
      icon: GraduationCap,
      href: "/dashboard/report-cards",
    },
    { label: "Finance", icon: CreditCard, href: "/dashboard/finance" },
    { label: "Settings", icon: Settings, href: "/dashboard/settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-blue-900 text-white transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="p-4 border-b border-blue-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-blue-800 rounded"
            title="Toggle menu"
          >
            <Menu size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-800 transition"
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}
      >
        {/* Top bar */}
        <header className="bg-white shadow">
          <div className="px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">
              School Management System - Candle Public School
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-gray-600 text-sm">Welcome back!</p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
