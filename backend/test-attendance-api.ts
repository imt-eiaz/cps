import axios from "axios";
import { config } from "dotenv";

config();

const API_URL = "http://localhost:5000/api";

async function testAttendanceEndpoints() {
  try {
    console.log("🧪 Testing Attendance API Endpoints...\n");

    // First, you need to login to get a token
    console.log("1. Login to get authentication token...");
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: "abbas2u2024@gmail.com", // Use your test user email
      password: "Test@123", // Use your test user password
    });

    const token = loginResponse.data.data.token;
    console.log("✅ Login successful! Token obtained.\n");

    // Set up axios with token
    const authClient = axios.create({
      baseURL: API_URL,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Test 1: Get all classes
    console.log("2. Fetching classes...");
    const classesResponse = await authClient.get("/academic/classes?limit=100");
    const classes = classesResponse.data.data;
    console.log(`✅ Found ${classes.length} classes`);
    if (classes.length > 0) {
      console.log(
        `   First class: ${classes[0].className} (${classes[0].classCode})\n`,
      );
    }

    if (classes.length === 0) {
      console.log(
        "⚠️  No classes found. You may need to create classes first.\n",
      );
      return;
    }

    const testClassId = classes[0].id;
    const testDate = new Date().toISOString().split("T")[0];

    // Test 2: Get class attendance for today
    console.log(
      `3. Fetching attendance for class ${classes[0].className} on ${testDate}...`,
    );
    const attendanceResponse = await authClient.get(
      `/academic/attendance/class/${testClassId}?date=${testDate}`,
    );
    const attendanceData = attendanceResponse.data.data;
    console.log(`✅ Attendance retrieved successfully!`);
    console.log(`   Total students: ${attendanceData.students.length}`);
    console.log(`   Present: ${attendanceData.statistics.present}`);
    console.log(`   Absent: ${attendanceData.statistics.absent}`);
    console.log(`   Not Marked: ${attendanceData.statistics.notMarked}\n`);

    if (attendanceData.students.length === 0) {
      console.log("⚠️  No students enrolled in this class.\n");
      return;
    }

    // Test 3: Mark attendance for one student
    const testStudent = attendanceData.students[0];
    console.log(
      `4. Marking attendance for student: ${testStudent.firstName} ${testStudent.lastName}...`,
    );

    const markResponse = await authClient.post("/academic/attendance", {
      studentId: testStudent.id,
      classId: testClassId,
      attendanceDate: testDate,
      status: "present",
      remarks: "Test attendance marking",
    });
    console.log(`✅ Attendance marked successfully!\n`);

    // Test 4: Bulk mark attendance
    console.log(`5. Testing bulk attendance marking...`);
    const bulkRecords = attendanceData.students
      .slice(0, 3)
      .map((student: any) => ({
        studentId: student.id,
        status: "present",
        remarks: "Bulk test",
      }));

    const bulkResponse = await authClient.post("/academic/attendance/bulk", {
      classId: testClassId,
      attendanceDate: testDate,
      attendanceRecords: bulkRecords,
    });
    console.log(`✅ Bulk attendance marked successfully!`);
    console.log(`   Successful: ${bulkResponse.data.data.successful}`);
    console.log(`   Failed: ${bulkResponse.data.data.failed}\n`);

    // Test 5: Get updated attendance
    console.log(`6. Fetching updated attendance...`);
    const updatedAttendance = await authClient.get(
      `/academic/attendance/class/${testClassId}?date=${testDate}`,
    );
    console.log(`✅ Updated attendance retrieved!`);
    console.log(
      `   Present: ${updatedAttendance.data.data.statistics.present}`,
    );
    console.log(`   Absent: ${updatedAttendance.data.data.statistics.absent}`);
    console.log(
      `   Not Marked: ${updatedAttendance.data.data.statistics.notMarked}\n`,
    );

    console.log("🎉 All attendance API tests passed successfully!");
    console.log("\n✅ Attendance system is fully functional!");
  } catch (error: any) {
    console.error("\n❌ Test failed!");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Message:", error.response.data?.message || error.message);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

testAttendanceEndpoints();
