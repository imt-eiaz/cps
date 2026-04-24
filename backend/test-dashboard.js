const axios = require("axios");

async function testDashboard() {
  try {
    console.log("\n=== Testing Dashboard Endpoint ===\n");

    // First, login as admin to get token
    console.log("1. Logging in as admin...");
    const loginResponse = await axios.post(
      "http://localhost:5000/api/auth/login",
      {
        email: "imtiaz@example.com",
        password: "password123",
      },
    );

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;

    console.log("✅ Login successful");
    console.log("User:", user);
    console.log("Token received:", token ? "Yes" : "No");

    // Now fetch dashboard stats
    console.log("\n2. Fetching dashboard statistics...");
    const dashboardResponse = await axios.get(
      "http://localhost:5000/api/admin/dashboard",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    console.log("\n✅ Dashboard data retrieved successfully:\n");
    console.log(JSON.stringify(dashboardResponse.data.data, null, 2));

    console.log("\n=== Test Complete ===\n");
  } catch (error) {
    console.error("\n❌ Error:", error.response?.data || error.message);
  }
}

testDashboard();
