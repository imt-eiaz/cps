import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("\n🔴 ERROR HANDLER TRIGGERED");
  console.error("Error instance:", err.constructor.name);
  console.error("Error message:", err.message);
  console.error("Error status code:", err.statusCode);

  if (err instanceof AppError) {
    console.error("✅ Handling as AppError");
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode,
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    console.error("⚠️ JWT Token Error");
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      statusCode: 401,
    });
  }

  if (err.name === "TokenExpiredError") {
    console.error("⚠️ JWT Token Expired");
    return res.status(401).json({
      success: false,
      message: "Token expired",
      statusCode: 401,
    });
  }

  // Handle database errors
  if (err.code === "23505") {
    console.error("⚠️ Database Duplicate Key Error");
    const message = `Duplicate field value. ${err.detail}`;
    return res.status(409).json({
      success: false,
      message,
      statusCode: 409,
    });
  }

  if (err.code === "23503") {
    console.error("⚠️ Database Foreign Key Error");
    const message = `Invalid reference. ${err.detail}`;
    return res.status(400).json({
      success: false,
      message,
      statusCode: 400,
    });
  }

  // Generic error
  console.error("❌ Unhandled error:");
  console.error("  Type:", err.constructor.name);
  console.error("  Message:", err.message);
  console.error("  Code:", err.code);
  console.error("  Stack:", err.stack);
  console.error("🔴 END ERROR\n");

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "An unexpected error occurred",
    statusCode: 500,
  });
};

export const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
