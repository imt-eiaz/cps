import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Test token generation and verification
const testPayload = {
  userId: "test-user-id",
  email: "test@example.com",
  roleId: "test-role-id",
  roleName: "admin",
};

console.log("\n=== JWT Token Test ===\n");
console.log("JWT_SECRET from .env:", JWT_SECRET);
console.log("Payload:", testPayload);

// Generate token
const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: "24h" });
console.log("\nGenerated Token:", token);

// Verify token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log("\n✅ Token verification successful!");
  console.log("Decoded payload:", decoded);
} catch (error: any) {
  console.log("\n❌ Token verification failed!");
  console.log("Error:", error.message);
}

// Test with wrong secret
try {
  const wrongDecoded = jwt.verify(token, "wrong-secret");
  console.log("\n❌ This should not happen - wrong secret worked!");
} catch (error: any) {
  console.log("\n✅ Expected error with wrong secret:", error.message);
}

console.log("\n=== Test Complete ===\n");
