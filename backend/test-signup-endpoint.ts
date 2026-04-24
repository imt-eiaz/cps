import axios from "axios";

const testSignupEndpoint = async () => {
  try {
    console.log("Testing signup endpoint...\n");

    const userData = {
      email: `testuser${Date.now()}@example.com`,
      password: "Test@123456",
      firstName: "Test",
      lastName: "User",
      roleId: "student",
    };

    console.log("Sending signup request with data:");
    console.log(JSON.stringify(userData, null, 2));
    console.log("\n");

    const response = await axios.post(
      "http://localhost:5000/api/auth/signup",
      userData,
    );

    console.log("✅ Signup successful!");
    console.log("Response status:", response.status);
    console.log("Response data:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Signup failed!");

    if (error.response) {
      console.error("\nResponse Status:", error.response.status);
      console.error("Response Data:");
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error("No response received from server");
      console.error("Error:", error.message);
      console.error("Make sure backend is running on port 5000");
    } else {
      console.error("Error:", error.message);
    }
  }
};

testSignupEndpoint();
