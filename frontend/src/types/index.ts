// App types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  roleName: string;
  status: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (formData: SignupFormData) => Promise<void>;
  logout: () => Promise<void>;
}

export interface SignupFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface Student {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  admissionDate: string;
  dateOfBirth: string;
  gender?: string;
  status: string;
}

export interface Teacher {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  dateOfJoining: string;
  specialization?: string;
  status: string;
}

export interface Class {
  id: string;
  className: string;
  sectionName: string;
  classCode: string;
  studentCapacity: number;
}

export interface Attendance {
  id: string;
  attendanceDate: string;
  status: "present" | "absent" | "late" | "leave";
  remarks?: string;
}

export interface Mark {
  id: string;
  examName: string;
  subjectName: string;
  obtainedMarks: number;
  totalMarks: number;
  grade?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  publishedDate: string;
  announcementType: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
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

// Exam and Marks types
export interface Exam {
  id: string;
  name: string;
  term?: string;
  academicYear: string;
  examType: string;
  startDate: string;
  endDate: string;
  passingMarks: number;
  isPublished: boolean;
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
  exam: {
    id: string;
    name: string;
    term?: string;
    academicYear: string;
    passingMarks: number;
  };
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

export interface ExamSummary {
  examId: string;
  examName: string;
  term?: string;
  examType: string;
  academicYear: string;
  date: string;
  isPublished: boolean;
  subjectsCount: number;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  overallGrade: string;
  overallGPA: number;
  absentCount: number;
}
