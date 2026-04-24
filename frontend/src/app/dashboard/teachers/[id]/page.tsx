"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  BookOpen,
  Briefcase,
  Edit,
  Trash2,
} from "lucide-react";
import apiClient from "@/lib/api";

interface TeacherDetails {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  employeeId: string;
  dateOfJoining: string;
  dateOfBirth: string;
  gender: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  status: string;
}

interface ClassInfo {
  id: string;
  class_name: string;
  section_name: string;
  class_code: string;
}

interface SubjectInfo {
  id: string;
  subject_code: string;
  subject_name: string;
}

export default function TeacherDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [teacher, setTeacher] = useState<TeacherDetails | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTeacherDetails();
  }, [params.id]);

  const fetchTeacherDetails = async () => {
    try {
      setLoading(true);
      const [teacherRes, classesRes, subjectsRes] = await Promise.all([
        apiClient.get(`/academic/teachers/${params.id}`),
        apiClient.get(`/academic/teachers/${params.id}/classes`),
        apiClient.get(`/academic/teachers/${params.id}/subjects`),
      ]);
      setTeacher(teacherRes.data.data);
      setClasses(classesRes.data.data || []);
      setSubjects(subjectsRes.data.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch teacher details",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return "N/A";
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "on_leave":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "resigned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading teacher details...</p>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="p-6">
        <Link
          href="/dashboard/teachers"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Teachers
        </Link>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || "Teacher not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/teachers"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Teachers
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              {teacher.firstName} {teacher.lastName}
            </h1>
            <p className="text-gray-600 mt-2">ID: {teacher.employeeId}</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg">
              <Edit size={20} />
            </button>
            <button className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg">
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6 flex gap-4 items-center">
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
            teacher.status,
          )}`}
        >
          Status: {teacher.status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal & Professional Information */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Email */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail size={18} className="text-blue-600" />
                <p className="text-sm text-gray-600">Email</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {teacher.email}
              </p>
            </div>

            {/* Phone */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone size={18} className="text-blue-600" />
                <p className="text-sm text-gray-600">Phone</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {teacher.phone || "N/A"}
              </p>
            </div>

            {/* Gender */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-blue-600" />
                <p className="text-sm text-gray-600">Gender</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {teacher.gender || "N/A"}
              </p>
            </div>

            {/* Date of Birth */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-blue-600" />
                <p className="text-sm text-gray-600">Date of Birth</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {formatDate(teacher.dateOfBirth)}
              </p>
              <p className="text-sm text-gray-500">
                Age: {calculateAge(teacher.dateOfBirth)} years
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-blue-600" />
              <p className="text-sm text-gray-600">Address</p>
            </div>
            <p className="text-gray-900 mb-2">{teacher.address || "N/A"}</p>
            <p className="text-sm text-gray-600">
              {teacher.city}, {teacher.state} {teacher.postalCode}
            </p>
          </div>

          {/* Professional Information */}
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            Professional Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Qualification */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={18} className="text-green-600" />
                <p className="text-sm text-gray-600">Qualification</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {teacher.qualification || "N/A"}
              </p>
            </div>

            {/* Specialization */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={18} className="text-green-600" />
                <p className="text-sm text-gray-600">Specialization</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {teacher.specialization || "N/A"}
              </p>
            </div>

            {/* Experience */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={18} className="text-green-600" />
                <p className="text-sm text-gray-600">Experience</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {teacher.experienceYears} years
              </p>
            </div>

            {/* Date of Joining */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-green-600" />
                <p className="text-sm text-gray-600">Date of Joining</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {formatDate(teacher.dateOfJoining)}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Info Sidebar */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Teaching Assignment
          </h2>

          {/* Classes */}
          <div className="mb-6">
            <p className="font-semibold text-gray-700 mb-3">Classes Assigned</p>
            {classes.length > 0 ? (
              <div className="space-y-2">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <p className="font-medium text-blue-900">
                      {cls.class_name}
                    </p>
                    <p className="text-sm text-blue-700">
                      Section: {cls.section_name}
                    </p>
                    <p className="text-xs text-blue-600">{cls.class_code}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No classes assigned</p>
            )}
          </div>

          {/* Subjects */}
          <div className="pt-6 border-t border-gray-200">
            <p className="font-semibold text-gray-700 mb-3">
              Subjects Teaching
            </p>
            {subjects.length > 0 ? (
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <p className="font-medium text-green-900">
                      {subject.subject_name}
                    </p>
                    <p className="text-xs text-green-600">
                      {subject.subject_code}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No subjects assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left">
          <p className="font-semibold text-purple-900">View Performance</p>
          <p className="text-sm text-purple-700">
            Check teaching performance metrics
          </p>
        </button>
        <button className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-left">
          <p className="font-semibold text-indigo-900">Assigned Students</p>
          <p className="text-sm text-indigo-700">
            View students in assigned classes
          </p>
        </button>
      </div>
    </div>
  );
}
