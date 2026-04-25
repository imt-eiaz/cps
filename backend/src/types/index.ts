// User and Auth types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  status: "active" | "inactive" | "suspended";
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  tenantId?: string; // Multi-tenant support
  isSuperAdmin?: boolean; // Platform-level admin flag
  iat?: number;
  exp?: number;
}

// Student types
export interface Student {
  id: string;
  userId: string;
  admissionNumber: string;
  admissionDate: Date;
  dateOfBirth: Date;
  gender?: string;
  fatherName?: string;
  motherName?: string;
  guardianContact?: string;
  bloodGroup?: string;
  medicalConditions?: string;
  address?: string;
  status: "active" | "inactive" | "graduated" | "transferred";
}

// Teacher types
export interface Teacher {
  id: string;
  userId: string;
  employeeId: string;
  dateOfJoining: Date;
  dateOfBirth?: Date;
  gender?: string;
  qualification?: string;
  specialization?: string;
  experienceYears?: number;
  status: "active" | "inactive" | "on_leave" | "resigned";
}

// Parent types
export interface Parent {
  id: string;
  userId: string;
  occupation?: string;
  relationshipToStudent?: string;
}

// Class types
export interface Class {
  id: string;
  academicYearId: string;
  className: string;
  sectionName: string;
  classCode: string;
  classTeacherId?: string;
  studentCapacity: number;
  description?: string;
}

// Subject types
export interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  description?: string;
  creditHours: number;
}

// Attendance types
export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  attendanceDate: Date;
  status: "present" | "absent" | "late" | "leave";
  remarks?: string;
  markedBy?: string;
}

// Fee types
export interface Invoice {
  id: string;
  studentId: string;
  academicYearId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
  status: "pending" | "partial" | "paid" | "overdue" | "cancelled";
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: "cash" | "cheque" | "bank_transfer" | "online" | "credit_card";
  transactionId?: string;
  status: "pending" | "completed" | "failed" | "refunded";
}

// Announcement types
export interface Announcement {
  id: string;
  title: string;
  description: string;
  announcementType: "general" | "academic" | "event" | "emergency";
  createdBy: string;
  publishedDate: Date;
  expiryDate?: Date;
  isActive: boolean;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  notificationType?: string;
  isRead: boolean;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth Request/Response
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

// Query parameters
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FilterParams {
  [key: string]: any;
}

// Exam and Marks types
export interface Exam {
  id: string;
  academicYearId: string;
  examName: string;
  examCode: string;
  description?: string;
  examType: "midterm" | "final" | "quiz" | "practical" | "other";
  term?: string;
  startDate: Date;
  endDate: Date;
  totalMarks: number;
  passingMarks: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Mark {
  id: string;
  studentId: string;
  examId: string;
  subjectId: string;
  classId: string;
  marksObtained: number;
  maxMarks: number;
  graceMarks: number;
  grade: string;
  gpa: number;
  percentage: number;
  isAbsent: boolean;
  remarks?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubjectMark {
  subjectId: string;
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  gpa: number;
  isAbsent: boolean;
  remarks?: string;
}

export interface StudentResult {
  exam: Exam;
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
  };
  subjects: SubjectMark[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  overallGrade: string;
  overallGPA: number;
  passed: boolean;
  passFailReason?: string;
  rank?: number;
}

export interface BulkMarkUpload {
  examId: string;
  classId: string;
  subjectId: string;
  marks: Array<{
    studentId: string;
    marksObtained: number;
    isAbsent?: boolean;
    graceMarks?: number;
    remarks?: string;
  }>;
}

export interface ClassResultSheet {
  exam: Exam;
  class: {
    id: string;
    name: string;
  };
  students: Array<{
    studentId: string;
    studentName: string;
    admissionNumber: string;
    subjects: SubjectMark[];
    totalObtained: number;
    totalMax: number;
    percentage: number;
    overallGrade: string;
    overallGPA: number;
    rank: number;
    passed: boolean;
  }>;
}

// ==================== MULTI-TENANT TYPES ====================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  status: "active" | "inactive" | "suspended";
  subscriptionTier: "basic" | "pro" | "enterprise";
  maxUsers: number;
  maxStudents: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface TenantSettings {
  id: string;
  tenantId: string;
  schoolName?: string;
  schoolCode?: string;
  principalName?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  foundedYear?: number;
  academicYearStart?: Date;
  academicYearEnd?: Date;
  currencyCode: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planName: string;
  priceMonthly?: number;
  priceAnnual?: number;
  billingCycle: "monthly" | "annual";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  renewalDate: Date;
  autoRenew: boolean;
  paymentMethod?: string;
  status: "active" | "paused" | "cancelled" | "past_due";
  createdAt: Date;
  updatedAt: Date;
}

export interface SuperAdmin {
  id: string;
  userId: string;
  createdAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
}
