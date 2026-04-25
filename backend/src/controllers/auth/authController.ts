import { Request, Response } from "express";
import { query } from "../../config/database.js";
import {
  generateToken,
  hashPassword,
  comparePassword,
} from "../../utils/auth.js";
import { sendResponse, sendError } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { AuthRequest } from "../../middleware/auth.js";

export const signup = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, roleId } = req.body;

    console.log("\n=== SIGNUP REQUEST ===");
    console.log("Attempting signup with:", {
      email,
      firstName,
      lastName,
      roleId,
      hasPassword: !!password,
    });

    // Validate input
    if (!email || !password || !firstName || !lastName || !roleId) {
      console.log("❌ Missing required fields");
      return sendError(res, 400, "Missing required fields");
    }

    // Check if user exists
    console.log("🔍 Checking if email already exists...");
    const userExists = await query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (userExists.rowCount && userExists.rowCount > 0) {
      console.log("❌ Email already registered");
      return sendError(res, 409, "Email already registered");
    }

    // Get role ID by name if roleId is a string (role name)
    let finalRoleId = roleId;
    if (typeof roleId === "string" && !roleId.match(/^[0-9a-f\-]{36}$/)) {
      // roleId looks like a role name, not a UUID
      console.log("🔍 Looking up role by name:", roleId.toLowerCase());
      const roleResult = await query("SELECT id FROM roles WHERE name = $1", [
        roleId.toLowerCase(),
      ]);

      console.log(
        `Role query returned: rowCount=${roleResult.rowCount}, rows=[${roleResult.rows.map((r) => r.name).join(",")}]`,
      );

      if (roleResult.rowCount === 0) {
        console.log("❌ Invalid role provided:", roleId);
        const availableRoles = await query("SELECT id, name FROM roles");
        const roleNames = availableRoles.rows.map((r) => r.name).join(", ");
        console.log("Available roles:", roleNames);
        return sendError(
          res,
          400,
          `Invalid role. Available roles: ${roleNames}`,
        );
      }
      finalRoleId = roleResult.rows[0].id;
      console.log("✅ Role found. ID:", finalRoleId);
    }

    // Hash password
    console.log("🔐 Hashing password...");
    let hashedPassword;
    try {
      hashedPassword = await hashPassword(password);
      console.log("✅ Password hashed successfully");
    } catch (hashError) {
      console.error("❌ Password hashing failed:", hashError);
      throw hashError;
    }

    // Create user with password hash
    console.log("💾 Creating user in database...");
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name, role_id, status, created_at`,
      [
        email.toLowerCase(),
        hashedPassword,
        firstName,
        lastName,
        finalRoleId,
        "active",
      ],
    );

    console.log("✅ User created successfully");

    const user = result.rows[0];

    // Get role name for the user
    console.log("🔍 Fetching role name...");
    const roleResult = await query("SELECT name FROM roles WHERE id = $1", [
      user.role_id,
    ]);
    const roleName = roleResult.rows[0]?.name || "user";
    console.log("✅ Role name:", roleName);

    // Generate token
    console.log("🔑 Generating JWT token...");
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: roleName,
    });
    console.log("✅ Token generated");

    console.log("=== SIGNUP SUCCESS ===\n");

    sendResponse(res, 201, "User created successfully", {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id,
        roleName: roleName,
      },
      token,
      expiresIn: 86400, // 24 hours
    });
  } catch (error) {
    console.error("\n=== SIGNUP ERROR ===");
    console.error("Error type:", (error as Error).constructor.name);
    console.error("Error message:", (error as Error).message);
    console.error("Error code:", (error as any).code);
    console.error("Full error:", error);
    console.error("=== END ERROR ===\n");
    throw error;
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, "Email and password are required");
  }

  // Get user with role
  const result = await query(
    `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.role_id, COALESCE(r.name, 'user') as role_name, u.status
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1`,
    [email.toLowerCase()],
  );

  if (result.rowCount === 0) {
    return sendError(res, 401, "Invalid credentials");
  }

  const user = result.rows[0];

  if (user.status !== "active") {
    return sendError(res, 403, "Account is inactive or suspended");
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password_hash);
  if (!isValidPassword) {
    return sendError(res, 401, "Invalid credentials");
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    roleId: user.role_id,
    roleName: user.role_name,
  });

  console.log("\n=== LOGIN TOKEN GENERATION ===");
  console.log(
    "JWT_SECRET available:",
    process.env.JWT_SECRET ? "Yes" : "No (using fallback)",
  );
  console.log("Token payload:", {
    userId: user.id,
    email: user.email,
    roleId: user.role_id,
    roleName: user.role_name,
  });
  console.log(
    "Token generated (first 50 chars):",
    token.substring(0, 50) + "...",
  );
  console.log("=== END LOGIN TOKEN ===\n");

  // Update last login
  await query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

  sendResponse(res, 200, "Login successful", {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roleId: user.role_id,
      roleName: user.role_name,
    },
    token,
    expiresIn: 86400, // 24 hours
  });
});

export const getCurrentUser = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return sendError(res, 401, "Not authenticated");
    }

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role_id, r.name as role_name, u.status
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user.userId],
    );

    if (result.rowCount === 0) {
      return sendError(res, 404, "User not found");
    }

    const user = result.rows[0];

    sendResponse(res, 200, "User retrieved successfully", {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      roleId: user.role_id,
      roleName: user.role_name,
      status: user.status,
    });
  },
);

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  // In a stateless JWT system, logout is handled on the client side
  // by removing the token from localStorage
  sendResponse(res, 200, "Logout successful");
});

export const verifyToken = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return sendError(res, 401, "Invalid token");
    }

    sendResponse(res, 200, "Token is valid", { user: req.user });
  },
);
