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
import { TenantRequest } from "../../core/tenant/tenant.middleware.js";
import { getTenantById } from "../../core/tenant/tenant.service.js";

interface SignupRequest extends TenantRequest {
  body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId?: string;
  };
}

interface LoginRequest extends TenantRequest {
  body: {
    email: string;
    password: string;
  };
}

/**
 * MULTI-TENANT SIGNUP
 * For tenant signup: requires tenant context (subdomain)
 * For super admin signup: use /auth/admin/signup instead
 */
export const signup = asyncHandler(
  async (req: SignupRequest, res: Response) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        roleId = "student",
      } = req.body;

      console.log("\n=== MULTI-TENANT SIGNUP ===");
      console.log("Email:", email);
      console.log("Tenant ID:", req.tenantId);

      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return sendError(res, 400, "Missing required fields");
      }

      // ========== TENANT CONTEXT REQUIRED ==========
      if (!req.tenantId) {
        console.log("❌ No tenant context for signup");
        return sendError(
          res,
          400,
          "Signup requires tenant context. Please access from your school domain.",
        );
      }

      const tenantId = req.tenantId;

      // Check if user already exists in this tenant
      console.log("🔍 Checking if email already exists in tenant...");
      const userExists = await query(
        "SELECT id FROM users WHERE email = $1 AND tenant_id = $2",
        [email.toLowerCase(), tenantId],
      );

      if (userExists.rowCount && userExists.rowCount > 0) {
        console.log("❌ Email already registered in this tenant");
        return sendError(res, 409, "Email already registered");
      }

      // Get role ID by name if needed
      let finalRoleId = roleId;
      if (typeof roleId === "string" && !roleId.match(/^[0-9a-f\-]{36}$/)) {
        console.log("🔍 Looking up role by name:", roleId.toLowerCase());
        const roleResult = await query("SELECT id FROM roles WHERE name = $1", [
          roleId.toLowerCase(),
        ]);

        if (roleResult.rowCount === 0) {
          return sendError(
            res,
            400,
            `Invalid role. Available roles: student, teacher, admin, parent`,
          );
        }
        finalRoleId = roleResult.rows[0].id;
      }

      // Check tenant user limit
      const userCount = await query(
        "SELECT COUNT(*) FROM users WHERE tenant_id = $1",
        [tenantId],
      );

      const tenant = await getTenantById(tenantId);
      if (tenant && parseInt(userCount.rows[0].count) >= tenant.maxUsers) {
        return sendError(
          res,
          402,
          `User limit reached for your school (${tenant.maxUsers} users). Please contact your school admin.`,
        );
      }

      // Hash password
      console.log("🔐 Hashing password...");
      const hashedPassword = await hashPassword(password);

      // Create user with tenant_id
      console.log("💾 Creating user...");
      const result = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role_id, tenant_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, first_name, last_name, role_id, tenant_id, status, created_at`,
        [
          email.toLowerCase(),
          hashedPassword,
          firstName,
          lastName,
          finalRoleId,
          tenantId,
          "active",
        ],
      );

      if (result.rows.length === 0) {
        throw new Error("Failed to create user");
      }

      const user = result.rows[0];
      console.log("✅ User created successfully");

      // Get role name
      const roleResult = await query("SELECT name FROM roles WHERE id = $1", [
        user.role_id,
      ]);
      const roleName = roleResult.rows[0]?.name || "unknown";

      // Generate JWT with tenant context
      const token = generateToken({
        userId: user.id,
        email: user.email,
        roleId: user.role_id,
        roleName,
        tenantId: user.tenant_id,
        isSuperAdmin: false,
      });

      sendResponse(res, 201, "User created successfully", {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          tenantId: user.tenant_id,
          role: roleName,
        },
        token,
      });
    } catch (error) {
      console.error("❌ Signup error:", error);
      throw error;
    }
  },
);

/**
 * MULTI-TENANT LOGIN
 * Resolves user by email + tenant_id
 * Returns JWT with tenant context
 */
export const login = asyncHandler(async (req: LoginRequest, res: Response) => {
  const { email, password } = req.body;

  console.log("\n=== MULTI-TENANT LOGIN ===");
  console.log("Email:", email);
  console.log("Tenant ID:", req.tenantId);

  if (!email || !password) {
    return sendError(res, 400, "Email and password are required");
  }

  // ========== TENANT CONTEXT REQUIRED ==========
  if (!req.tenantId) {
    console.log("❌ No tenant context for login");
    return sendError(
      res,
      400,
      "Login requires tenant context. Please access from your school domain.",
    );
  }

  const tenantId = req.tenantId;

  // Find user by email AND tenant_id
  console.log("🔍 Finding user...");
  const userResult = await query(
    `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, 
              u.role_id, u.status, u.tenant_id
       FROM users u
       WHERE u.email = $1 AND u.tenant_id = $2
       LIMIT 1`,
    [email.toLowerCase(), tenantId],
  );

  if (userResult.rows.length === 0) {
    console.log("❌ User not found in tenant");
    return sendError(res, 401, "Invalid email or password for your school");
  }

  const user = userResult.rows[0];

  if (user.status !== "active") {
    console.log(`❌ User is ${user.status}`);
    return sendError(res, 403, `Account is ${user.status}`);
  }

  // Verify password
  console.log("🔐 Verifying password...");
  const passwordMatch = await comparePassword(password, user.password_hash);

  if (!passwordMatch) {
    console.log("❌ Password mismatch");
    return sendError(res, 401, "Invalid email or password for your school");
  }

  // Get role name
  const roleResult = await query("SELECT name FROM roles WHERE id = $1", [
    user.role_id,
  ]);
  const roleName = roleResult.rows[0]?.name || "unknown";

  // Update last login
  await query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [
    user.id,
  ]);

  // Generate JWT with tenant context
  const token = generateToken({
    userId: user.id,
    email: user.email,
    roleId: user.role_id,
    roleName,
    tenantId: user.tenant_id,
    isSuperAdmin: false,
  });

  console.log("✅ Login successful");

  sendResponse(res, 200, "Login successful", {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      tenantId: user.tenant_id,
      role: roleName,
    },
    token,
  });
});

/**
 * SUPER ADMIN LOGIN
 * Logs in platform-level admin (not tenant-specific)
 * Can access /admin endpoints without tenant context
 */
export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  console.log("\n=== SUPER ADMIN LOGIN ===");
  console.log("Email:", email);

  if (!email || !password) {
    return sendError(res, 400, "Email and password are required");
  }

  // Find user by email (super admin - no tenant_id)
  console.log("🔍 Finding super admin...");
  const userResult = await query(
    `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, 
              u.role_id, u.status, u.is_super_admin, sa.id as super_admin_id
       FROM users u
       LEFT JOIN super_admins sa ON u.id = sa.user_id
       WHERE u.email = $1 AND u.is_super_admin = TRUE AND u.tenant_id IS NULL
       LIMIT 1`,
    [email.toLowerCase()],
  );

  if (userResult.rows.length === 0) {
    console.log("❌ Super admin not found");
    return sendError(res, 401, "Invalid admin credentials");
  }

  const user = userResult.rows[0];

  if (user.status !== "active") {
    console.log(`❌ Admin is ${user.status}`);
    return sendError(res, 403, `Account is ${user.status}`);
  }

  // Verify password
  console.log("🔐 Verifying password...");
  const passwordMatch = await comparePassword(password, user.password_hash);

  if (!passwordMatch) {
    console.log("❌ Password mismatch");
    return sendError(res, 401, "Invalid admin credentials");
  }

  // Get role name
  const roleResult = await query("SELECT name FROM roles WHERE id = $1", [
    user.role_id,
  ]);
  const roleName = roleResult.rows[0]?.name || "unknown";

  // Update last login
  await query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [
    user.id,
  ]);

  // Generate JWT without tenant context (platform admin)
  const token = generateToken({
    userId: user.id,
    email: user.email,
    roleId: user.role_id,
    roleName,
    isSuperAdmin: true,
  });

  console.log("✅ Super admin login successful");

  sendResponse(res, 200, "Admin login successful", {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: roleName,
      isSuperAdmin: true,
    },
    token,
  });
});

/**
 * Get current user including tenant context
 */
export const getCurrentUser = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user || !req.user.userId) {
      return sendError(res, 401, "Not authenticated");
    }

    const result = await query(
      `SELECT id, email, first_name, last_name, role_id, tenant_id, 
              is_super_admin, status
       FROM users
       WHERE id = $1`,
      [req.user.userId],
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, "User not found");
    }

    const user = result.rows[0];

    const roleResult = await query("SELECT name FROM roles WHERE id = $1", [
      user.role_id,
    ]);
    const roleName = roleResult.rows[0]?.name || "unknown";

    sendResponse(res, 200, "User retrieved successfully", {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      tenantId: user.tenant_id,
      role: roleName,
      isSuperAdmin: user.is_super_admin,
      status: user.status,
    });
  },
);

/**
 * Logout (client-side token removal)
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendResponse(res, 200, "Logout successful");
});

/**
 * Verify token and get payload
 */
export const verifyToken = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return sendError(res, 401, "No token provided");
    }

    sendResponse(res, 200, "Token verified", req.user);
  },
);
