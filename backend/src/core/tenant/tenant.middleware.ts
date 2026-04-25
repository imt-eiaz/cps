import { Request, Response, NextFunction } from "express";
import { query } from "../../config/database.js";
import { sendError } from "../../utils/response.js";

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  status: "active" | "inactive" | "suspended";
  subscriptionTier: string;
  maxUsers: number;
  maxStudents: number;
}

export interface TenantRequest extends Request {
  tenant?: TenantInfo;
  tenantId?: string;
}

/**
 * Resolves subdomain from request host
 * Supports multiple formats:
 * - Production: school1.ventionz.com → "school1"
 * - Local dev: school1.localhost:3000 → "school1"
 * - Local dev: localhost:3000 → none (returns null)
 * - IP: localhost:3000 → none (returns null)
 */
function extractSubdomain(host: string | undefined): string | null {
  if (!host) return null;

  // Remove port if present
  const hostWithoutPort = host.split(":")[0].toLowerCase();

  // Check if it's localhost or IP address
  if (hostWithoutPort === "localhost" || hostWithoutPort === "127.0.0.1") {
    return null;
  }

  // Split by dots
  const parts = hostWithoutPort.split(".");

  // If only one part (e.g., "localhost"), no subdomain
  if (parts.length <= 1) {
    return null;
  }

  // Return the first part (subdomain)
  return parts[0];
}

/**
 * Fall back to a default tenant during local development
 * Set via DEVELOPMENT_MODE_TENANT env variable
 */
async function getDefaultTenantForDevelopment(): Promise<TenantInfo | null> {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const defaultSlug = process.env.DEVELOPMENT_MODE_TENANT || "demo";

  try {
    const result = await query(
      `SELECT id, name, slug, subdomain, status, subscription_tier as "subscriptionTier",
              max_users as "maxUsers", max_students as "maxStudents"
       FROM tenants
       WHERE slug = $1
       LIMIT 1`,
      [defaultSlug],
    );

    if (result.rows.length === 0) {
      console.warn(
        `[Tenant] Development mode: No default tenant found with slug "${defaultSlug}"`,
      );
      return null;
    }

    return result.rows[0] as TenantInfo;
  } catch (error) {
    console.error("[Tenant] Error fetching default tenant:", error);
    return null;
  }
}

/**
 * Main tenant resolver middleware
 * Extracts subdomain from host, resolves tenant from database,
 * and attaches to request context
 */
export const tenantMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const subdomain = extractSubdomain(req.get("host"));

    // For public endpoints (health check, docs, etc), continue without tenant
    if (isPublicPath(req.path)) {
      return next();
    }

    let tenant: TenantInfo | null = null;

    // Try to resolve tenant by subdomain
    if (subdomain) {
      const result = await query(
        `SELECT id, name, slug, subdomain, status, subscription_tier as "subscriptionTier",
                max_users as "maxUsers", max_students as "maxStudents"
         FROM tenants
         WHERE subdomain = $1 AND status = 'active'
         LIMIT 1`,
        [subdomain],
      );

      if (result.rows.length > 0) {
        tenant = result.rows[0] as TenantInfo;
      }
    }

    // If no tenant found and in development mode, use default
    if (!tenant && process.env.NODE_ENV === "development") {
      tenant = await getDefaultTenantForDevelopment();
    }

    // If still no tenant found, return error
    if (!tenant) {
      console.warn(
        `[Tenant] No active tenant found for subdomain: "${subdomain}"`,
      );
      return sendError(
        res,
        400,
        "Invalid tenant. Please access the system from your school's domain.",
      );
    }

    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant.id;

    console.log(`[Tenant] Resolved tenant: ${tenant.name} (${tenant.id})`);

    next();
  } catch (error) {
    console.error("[Tenant] Error in tenant middleware:", error);
    return sendError(res, 500, "Failed to resolve tenant");
  }
};

/**
 * Public paths that don't require tenant resolution
 */
function isPublicPath(path: string): boolean {
  const publicPaths = [
    "/health",
    "/ping",
    "/api/health",
    "/api/ping",
    "/docs",
    "/swagger",
    "/api-docs",
    "/auth/signup", // Allow signup without tenant resolution
  ];

  return publicPaths.some(
    (publicPath) => path.startsWith(publicPath) || path === publicPath,
  );
}

/**
 * Middleware to enforce tenant presence for protected routes
 * Use this on routes that require a tenant context
 */
export const requireTenant = (
  req: TenantRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.tenant || !req.tenantId) {
    return sendError(
      res,
      400,
      "Tenant context required. Please access from your school domain.",
    );
  }
  next();
};

/**
 * Middleware to validate tenant status
 * Checks if tenant is active and has valid subscription
 */
export const validateTenantStatus = (
  req: TenantRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.tenant) {
    return next();
  }

  if (req.tenant.status !== "active") {
    return sendError(
      res,
      403,
      `Your school account is currently ${req.tenant.status}. Please contact support.`,
    );
  }

  next();
};

/**
 * Attach tenantId to response headers for debugging
 * Can be used to verify tenant resolution on client side
 */
export const attachTenantToResponse = (
  req: TenantRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.tenant) {
    res.setHeader("X-Tenant-ID", req.tenant.id);
    res.setHeader("X-Tenant-Name", req.tenant.name);
    res.setHeader("X-Tenant-Slug", req.tenant.slug);
  }
  next();
};
