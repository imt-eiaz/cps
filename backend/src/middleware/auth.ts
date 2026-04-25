import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWTPayload } from "../types/index.js";

export interface AuthRequest extends Request {
  user?: JWTPayload;
  token?: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("\n=== AUTH DEBUG ===");
  console.log("Path:", req.path);
  console.log("Authorization header:", authHeader ? "Present" : "Missing");
  console.log("Token extracted:", token ? "Yes" : "No");
  console.log(
    "JWT_SECRET loaded:",
    process.env.JWT_SECRET ? "Yes" : "No (using fallback)",
  );

  if (!token) {
    console.log("❌ No token provided");
    console.log("=== END AUTH DEBUG ===\n");
    return res.status(401).json({
      success: false,
      message: "Access token required",
      statusCode: 401,
    });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "your-secret-key",
    (err: any, user: any) => {
      if (err) {
        console.log("❌ Token verification failed:", err.message);
        console.log("Error details:", err.name);
        console.log("=== END AUTH DEBUG ===\n");
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
          statusCode: 401,
        });
      }
      console.log("✅ Token verified successfully");
      console.log("User payload:", user);
      console.log("=== END AUTH DEBUG ===\n");
      req.user = user as JWTPayload;
      req.token = token;
      next();
    },
  );
};

export const authorizeRole = (roles: string | string[]) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        statusCode: 401,
      });
    }

    if (!allowed.includes(req.user.roleName)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowed.join(", ")}`,
        statusCode: 403,
      });
    }

    next();
  };
};

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
      (err: any, user: any) => {
        if (!err) {
          req.user = user as JWTPayload;
          req.token = token;
        }
        next();
      },
    );
  } else {
    next();
  }
};
