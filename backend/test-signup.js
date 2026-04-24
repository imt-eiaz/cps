import axios from "axios";

const testSignup = async () => {
  try {
    const response = await axios.post("http://localhost:5000/api/auth/signup", {
      email: `testuser${Date.now()}@example.com`,
      password: "Test@123456",
      firstName: "Test",
      lastName: "User",
      roleId: "student",
    });
    console.log("Success:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error(
        "Error Response:",
        JSON.stringify(
          {
            status: error.response.status,
            data: error.response.data,
          },
          null,
          2,
        ),
      );
    } else if (error.request) {
      console.error("No response received:", error.message);
    } else {
      console.error("Error:", error.message);
    }
  }
};

testSignup();
