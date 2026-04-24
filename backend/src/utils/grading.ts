// Grading and GPA calculation utilities

export interface GradeScale {
  min: number;
  max: number;
  grade: string;
  gpa: number;
  remark: string;
}

// Standard grading scale
export const GRADE_SCALE: GradeScale[] = [
  { min: 90, max: 100, grade: "A+", gpa: 4.0, remark: "Outstanding" },
  { min: 80, max: 89, grade: "A", gpa: 3.7, remark: "Excellent" },
  { min: 70, max: 79, grade: "B", gpa: 3.3, remark: "Very Good" },
  { min: 60, max: 69, grade: "C", gpa: 3.0, remark: "Good" },
  { min: 50, max: 59, grade: "D", gpa: 2.0, remark: "Satisfactory" },
  { min: 0, max: 49, grade: "F", gpa: 0.0, remark: "Fail" },
];

/**
 * Calculate percentage
 */
export const calculatePercentage = (
  obtained: number,
  total: number,
): number => {
  if (total === 0) return 0;
  return Math.round((obtained / total) * 100 * 100) / 100; // 2 decimal places
};

/**
 * Get grade based on percentage
 */
export const getGrade = (percentage: number): string => {
  const scale = GRADE_SCALE.find(
    (s) => percentage >= s.min && percentage <= s.max,
  );
  return scale?.grade || "F";
};

/**
 * Get GPA based on percentage
 */
export const getGPA = (percentage: number): number => {
  const scale = GRADE_SCALE.find(
    (s) => percentage >= s.min && percentage <= s.max,
  );
  return scale?.gpa || 0.0;
};

/**
 * Get remark based on percentage
 */
export const getRemark = (percentage: number): string => {
  const scale = GRADE_SCALE.find(
    (s) => percentage >= s.min && percentage <= s.max,
  );
  return scale?.remark || "Needs Improvement";
};

/**
 * Calculate overall GPA from multiple subjects
 */
export const calculateOverallGPA = (gpas: number[]): number => {
  if (gpas.length === 0) return 0;
  const sum = gpas.reduce((acc, gpa) => acc + gpa, 0);
  return Math.round((sum / gpas.length) * 100) / 100; // 2 decimal places
};

/**
 * Calculate overall percentage from marks
 */
export const calculateOverallPercentage = (
  totalObtained: number,
  totalMax: number,
): number => {
  return calculatePercentage(totalObtained, totalMax);
};

/**
 * Check if student passed (considering passing marks)
 */
export const hasPassed = (
  percentage: number,
  passingPercentage: number = 40,
): boolean => {
  return percentage >= passingPercentage;
};

/**
 * Check if student passed all subjects
 */
export const hasPassedAllSubjects = (
  subjectPercentages: number[],
  passingPercentage: number = 40,
): boolean => {
  return subjectPercentages.every((p) => p >= passingPercentage);
};

/**
 * Calculate total marks with grace marks
 */
export const calculateFinalMarks = (
  marksObtained: number,
  graceMarks: number = 0,
  maxMarks: number,
): number => {
  const total = marksObtained + graceMarks;
  return Math.min(total, maxMarks); // Cannot exceed max marks
};

/**
 * Get overall grade based on average GPA
 */
export const getOverallGrade = (averageGPA: number): string => {
  if (averageGPA >= 4.0) return "A+";
  if (averageGPA >= 3.7) return "A";
  if (averageGPA >= 3.3) return "B";
  if (averageGPA >= 3.0) return "C";
  if (averageGPA >= 2.0) return "D";
  return "F";
};

/**
 * Determine pass/fail status with detailed reason
 */
export interface PassFailResult {
  passed: boolean;
  reason?: string;
}

export const determinePassFailStatus = (
  subjectResults: Array<{
    subject: string;
    percentage: number;
    isAbsent: boolean;
  }>,
  passingPercentage: number = 40,
): PassFailResult => {
  // Check for absent students
  const absentSubjects = subjectResults.filter((s) => s.isAbsent);
  if (absentSubjects.length > 0) {
    return {
      passed: false,
      reason: `Absent in: ${absentSubjects.map((s) => s.subject).join(", ")}`,
    };
  }

  // Check for failed subjects
  const failedSubjects = subjectResults.filter(
    (s) => s.percentage < passingPercentage,
  );
  if (failedSubjects.length > 0) {
    return {
      passed: false,
      reason: `Failed in: ${failedSubjects.map((s) => s.subject).join(", ")}`,
    };
  }

  return { passed: true };
};
