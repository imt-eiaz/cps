import { query } from "../../config/database.js";
import { TenantInfo } from "./tenant.middleware.js";

export interface CreateTenantInput {
  name: string;
  slug: string;
  subdomain: string;
  subscriptionTier?: "basic" | "pro" | "enterprise";
  maxUsers?: number;
  maxStudents?: number;
}

export interface TenantSettingsInput {
  schoolName?: string;
  schoolCode?: string;
  principalName?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  foundedYear?: number;
  academicYearStart?: Date;
  academicYearEnd?: Date;
  currencyCode?: string;
  timezone?: string;
}

/**
 * Tenant Service - Handles all tenant-related operations
 */

/**
 * Create a new tenant (Super Admin only)
 */
export async function createTenant(
  input: CreateTenantInput,
): Promise<TenantInfo> {
  const {
    name,
    slug,
    subdomain,
    subscriptionTier = "basic",
    maxUsers = 100,
    maxStudents = 1000,
  } = input;

  // Validate inputs
  if (!name || !slug || !subdomain) {
    throw new Error("Name, slug, and subdomain are required");
  }

  // Check for duplicate slug
  const slugCheck = await query("SELECT id FROM tenants WHERE slug = $1", [
    slug,
  ]);
  if (slugCheck.rows.length > 0) {
    throw new Error(`Slug "${slug}" is already taken`);
  }

  // Check for duplicate subdomain
  const subdomainCheck = await query(
    "SELECT id FROM tenants WHERE subdomain = $1",
    [subdomain],
  );
  if (subdomainCheck.rows.length > 0) {
    throw new Error(`Subdomain "${subdomain}" is already taken`);
  }

  // Create tenant
  const result = await query(
    `INSERT INTO tenants (name, slug, subdomain, status, subscription_tier, max_users, max_students)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, slug, subdomain, status, subscription_tier as "subscriptionTier",
               max_users as "maxUsers", max_students as "maxStudents"`,
    [name, slug, subdomain, "active", subscriptionTier, maxUsers, maxStudents],
  );

  if (result.rows.length === 0) {
    throw new Error("Failed to create tenant");
  }

  const tenant = result.rows[0] as TenantInfo;

  // Initialize tenant settings
  await initializeTenantSettings(tenant.id);

  // Initialize default subscription
  await initializeTenantSubscription(tenant.id, subscriptionTier);

  console.log(`[Tenant] Created new tenant: ${name} (${tenant.id})`);

  return tenant;
}

/**
 * Get tenant by ID
 */
export async function getTenantById(
  tenantId: string,
): Promise<TenantInfo | null> {
  const result = await query(
    `SELECT id, name, slug, subdomain, status, subscription_tier as "subscriptionTier",
            max_users as "maxUsers", max_students as "maxStudents"
     FROM tenants
     WHERE id = $1
     LIMIT 1`,
    [tenantId],
  );

  return result.rows.length > 0 ? (result.rows[0] as TenantInfo) : null;
}

/**
 * Get tenant by subdomain
 */
export async function getTenantBySubdomain(
  subdomain: string,
): Promise<TenantInfo | null> {
  const result = await query(
    `SELECT id, name, slug, subdomain, status, subscription_tier as "subscriptionTier",
            max_users as "maxUsers", max_students as "maxStudents"
     FROM tenants
     WHERE subdomain = $1 AND status = 'active'
     LIMIT 1`,
    [subdomain],
  );

  return result.rows.length > 0 ? (result.rows[0] as TenantInfo) : null;
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(
  slug: string,
): Promise<TenantInfo | null> {
  const result = await query(
    `SELECT id, name, slug, subdomain, status, subscription_tier as "subscriptionTier",
            max_users as "maxUsers", max_students as "maxStudents"
     FROM tenants
     WHERE slug = $1
     LIMIT 1`,
    [slug],
  );

  return result.rows.length > 0 ? (result.rows[0] as TenantInfo) : null;
}

/**
 * List all tenants (Super Admin only)
 */
export async function listTenants(
  status?: "active" | "inactive" | "suspended",
) {
  let sql = "SELECT * FROM tenants";
  const params: any[] = [];

  if (status) {
    sql += " WHERE status = $1";
    params.push(status);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Update tenant status
 */
export async function updateTenantStatus(
  tenantId: string,
  status: "active" | "inactive" | "suspended",
) {
  const result = await query(
    `UPDATE tenants
     SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, name, slug, subdomain, status, subscription_tier as "subscriptionTier",
               max_users as "maxUsers", max_students as "maxStudents"`,
    [status, tenantId],
  );

  return result.rows.length > 0 ? (result.rows[0] as TenantInfo) : null;
}

/**
 * Update tenant subscription tier
 */
export async function updateTenantSubscription(
  tenantId: string,
  tier: "basic" | "pro" | "enterprise",
  limits: { maxUsers: number; maxStudents: number },
) {
  const result = await query(
    `UPDATE tenants
     SET subscription_tier = $1, max_users = $2, max_students = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING id, name, slug, subdomain, status, subscription_tier as "subscriptionTier",
               max_users as "maxUsers", max_students as "maxStudents"`,
    [tier, limits.maxUsers, limits.maxStudents, tenantId],
  );

  return result.rows.length > 0 ? (result.rows[0] as TenantInfo) : null;
}

/**
 * Initialize default tenant settings
 */
async function initializeTenantSettings(tenantId: string) {
  await query(
    `INSERT INTO tenant_settings (tenant_id, school_name, currency_code, timezone)
     VALUES ($1, (SELECT name FROM tenants WHERE id = $1), 'USD', 'UTC')`,
    [tenantId],
  );
}

/**
 * Initialize default subscription
 */
async function initializeTenantSubscription(tenantId: string, tier: string) {
  const plans: Record<string, { monthly: number; annual: number }> = {
    basic: { monthly: 99, annual: 990 },
    pro: { monthly: 299, annual: 2990 },
    enterprise: { monthly: 999, annual: 9990 },
  };

  const plan = plans[tier] || plans.basic;
  const now = new Date();
  const renewalDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO tenant_subscriptions 
     (tenant_id, plan_name, price_monthly, price_annual, current_period_start, current_period_end, renewal_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
    [tenantId, tier, plan.monthly, plan.annual, now, renewalDate, renewalDate],
  );
}

/**
 * Update tenant settings (name, school info, etc)
 */
export async function updateTenantSettings(
  tenantId: string,
  settings: TenantSettingsInput,
) {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const settingsMap: Record<string, string> = {
    schoolName: "school_name",
    schoolCode: "school_code",
    principalName: "principal_name",
    address: "address",
    city: "city",
    state: "state",
    postalCode: "postal_code",
    phone: "phone",
    email: "email",
    website: "website",
    logoUrl: "logo_url",
    foundedYear: "founded_year",
    academicYearStart: "academic_year_start",
    academicYearEnd: "academic_year_end",
    currencyCode: "currency_code",
    timezone: "timezone",
  };

  for (const [key, dbColumn] of Object.entries(settingsMap)) {
    const value = (settings as any)[key];
    if (value !== undefined) {
      updates.push(`${dbColumn} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return null;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(tenantId);

  const sql = `UPDATE tenant_settings
    SET ${updates.join(", ")}
    WHERE tenant_id = $${paramIndex}
    RETURNING *`;

  const result = await query(sql, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get tenant settings
 */
export async function getTenantSettings(tenantId: string) {
  const result = await query(
    "SELECT * FROM tenant_settings WHERE tenant_id = $1",
    [tenantId],
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete tenant (soft delete)
 */
export async function deleteTenant(tenantId: string) {
  const result = await query(
    `UPDATE tenants
     SET deleted_at = CURRENT_TIMESTAMP, status = 'inactive'
     WHERE id = $1
     RETURNING id`,
    [tenantId],
  );

  return result.rows.length > 0;
}

/**
 * Check tenant usage
 */
export async function getTenantUsage(tenantId: string) {
  const userCount = await query(
    "SELECT COUNT(*) FROM users WHERE tenant_id = $1",
    [tenantId],
  );

  const studentCount = await query(
    "SELECT COUNT(*) FROM students WHERE tenant_id = $1",
    [tenantId],
  );

  const tenant = await getTenantById(tenantId);

  return {
    tenantId,
    userCount: parseInt(userCount.rows[0].count),
    studentCount: parseInt(studentCount.rows[0].count),
    limits: tenant
      ? {
          maxUsers: tenant.maxUsers,
          maxStudents: tenant.maxStudents,
        }
      : null,
  };
}
