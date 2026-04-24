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
  Heart,
  AlertCircle,
  Edit,
  Trash2,
} from "lucide-react";
import apiClient from "@/lib/api";

interface StudentDetails {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  admissionDate: string;
  dateOfBirth: string;
  gender: string;
  fatherName: string;
  motherName: string;
  guardianContact: string;
  bloodGroup: string;
  medicalConditions: string;
  address: string;
  status: string;
  phone: string;
}

export default function StudentDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudentDetails();
  }, [params.id]);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/academic/students/${params.id}`);
      setStudent(response.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch student details",
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

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading student details...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6">
        <Link
          href="/dashboard/students"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Students
        </Link>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || "Student not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/students"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Students
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-gray-600 mt-2">
              Admission #: {student.admissionNumber}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              title="Edit student"
              aria-label="Edit student"
              className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg"
            >
              <Edit size={20} />
            </button>
            <button
              title="Delete student"
              aria-label="Delete student"
              className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6 flex gap-4 items-center">
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            student.status === "active"
              ? "bg-green-100 text-green-800"
              : student.status === "inactive"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          Status:{" "}
          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
        </span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Email */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail size={18} className="text-blue-600" />
                <p className="text-sm text-gray-600">Email</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {student.email}
              </p>
            </div>

            {/* Phone */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone size={18} className="text-blue-600" />
                <p className="text-sm text-gray-600">Phone</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {student.phone || "N/A"}
              </p>
            </div>

            {/* Gender */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-blue-600" />
                <p className="text-sm text-gray-600">Gender</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {student.gender || "N/A"}
              </p>
            </div>

            {/* Date of Birth */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-blue-600" />
                <p className="text-sm text-gray-600">Date of Birth</p>
              </div>
              <p className="text-lg font-medium text-gray-900">
                {formatDate(student.dateOfBirth)}
              </p>
              <p className="text-sm text-gray-500">
                Age: {calculateAge(student.dateOfBirth)} years
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-blue-600" />
              <p className="text-sm text-gray-600">Address</p>
            </div>
            <p className="text-gray-900">{student.address || "N/A"}</p>
          </div>

          {/* Admission Info */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">Admission Date</p>
              <p className="text-lg font-medium text-gray-900">
                {formatDate(student.admissionDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Admission Number</p>
              <p className="text-lg font-medium text-gray-900">
                {student.admissionNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Family & Health Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Family & Health
          </h2>

          {/* Blood Group */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={18} className="text-red-600" />
              <p className="text-sm text-gray-600">Blood Group</p>
            </div>
            <p className="text-lg font-medium text-gray-900">
              {student.bloodGroup || "Not specified"}
            </p>
          </div>

          {/* Father's Name */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Father's Name</p>
            <p className="text-gray-900 font-medium">
              {student.fatherName || "N/A"}
            </p>
          </div>

          {/* Mother's Name */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Mother's Name</p>
            <p className="text-gray-900 font-medium">
              {student.motherName || "N/A"}
            </p>
          </div>

          {/* Guardian Contact */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Guardian Contact</p>
            <p className="text-gray-900 font-medium">
              {student.guardianContact || "N/A"}
            </p>
          </div>

          {/* Medical Conditions */}
          {student.medicalConditions && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle
                  size={20}
                  className="text-yellow-600 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-yellow-800 mb-1">
                    Medical Conditions
                  </p>
                  <p className="text-sm text-yellow-700">
                    {student.medicalConditions}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link
          href={`/dashboard/students/${params.id}/attendance`}
          className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <p className="font-semibold text-blue-900">View Attendance</p>
          <p className="text-sm text-blue-700">Check attendance records</p>
        </Link>
        <Link
          href={`/dashboard/results?studentId=${params.id}`}
          className="p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          <p className="font-semibold text-green-900">View Results & Exams</p>
          <p className="text-sm text-green-700">
            Open exam-wise results and detailed mark sheets
          </p>
        </Link>
        <Link
          href={`/dashboard/exams?studentId=${params.id}`}
          className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <p className="font-semibold text-purple-900">View Exam Schedules</p>
          <p className="text-sm text-purple-700">
            Open this student&apos;s exam schedule plan
          </p>
        </Link>
        <Link
          href={`/dashboard/report-cards/student/${params.id}`}
          className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <p className="font-semibold text-orange-900">View Report Card</p>
          <p className="text-sm text-orange-700">
            Open complete report card with grades and attendance
          </p>
        </Link>
        <Link
          href={`/dashboard/assignments/student?studentId=${params.id}`}
          className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <p className="font-semibold text-indigo-900">View Assignments</p>
          <p className="text-sm text-indigo-700">
            Open homework dashboard and submission status
          </p>
        </Link>
      </div>
    </div>
  );
}
