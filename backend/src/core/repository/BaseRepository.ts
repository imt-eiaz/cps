import { query, QueryResult } from "../../config/database.js";

export interface BaseEntity {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  tenantId?: string;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  filters?: Record<string, any>;
}

/**
 * BaseRepository - Provides automatic tenant scoping for all queries
 *
 * Usage:
 * ```ts
 * class StudentRepository extends BaseRepository<Student> {
 *   constructor(tenantId: string) {
 *     super('students', tenantId);
 *   }
 *
 *   async getByAdmissionNumber(admissionNumber: string) {
 *     // Automatically scoped to tenant
 *     return this.findOne({ admission_number: admissionNumber });
 *   }
 * }
 * ```
 */
export class BaseRepository<T extends BaseEntity> {
  protected tableName: string;
  protected tenantId: string;

  constructor(tableName: string, tenantId: string) {
    this.tableName = tableName;
    this.tenantId = tenantId;

    if (!tenantId) {
      console.warn(
        `[Repository] No tenantId provided for ${tableName}. All queries will be unscoped!`,
      );
    }
  }

  /**
   * Find all records with optional filtering
   */
  async findAll(options?: QueryOptions): Promise<T[]> {
    const { limit, offset, orderBy, filters } = options || {};

    let sql = `SELECT * FROM ${this.tableName} WHERE tenant_id = $1`;
    const params: any[] = [this.tenantId];
    let paramIndex = 2;

    // Apply additional filters
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          sql += ` AND ${key} = $${paramIndex}`;
          params.push(value);
          paramIndex++;
        }
      }
    }

    // Order by
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    // Pagination
    if (limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(limit);
      paramIndex++;
    }

    if (offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(offset);
      paramIndex++;
    }

    const result = await query(sql, params);
    return result.rows as T[];
  }

  /**
   * Find one record by criteria
   */
  async findOne(criteria: Record<string, any>): Promise<T | null> {
    const entries = Object.entries(criteria);
    let sql = `SELECT * FROM ${this.tableName} WHERE tenant_id = $1`;
    const params: any[] = [this.tenantId];
    let paramIndex = 2;

    for (const [key, value] of entries) {
      if (value !== undefined && value !== null) {
        sql += ` AND ${key} = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    sql += " LIMIT 1";

    const result = await query(sql, params);
    return result.rows.length > 0 ? (result.rows[0] as T) : null;
  }

  /**
   * Find by ID (with tenant check)
   */
  async findById(id: string): Promise<T | null> {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, this.tenantId],
    );

    return result.rows.length > 0 ? (result.rows[0] as T) : null;
  }

  /**
   * Get count of records
   */
  async count(filters?: Record<string, any>): Promise<number> {
    let sql = `SELECT COUNT(*) FROM ${this.tableName} WHERE tenant_id = $1`;
    const params: any[] = [this.tenantId];
    let paramIndex = 2;

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          sql += ` AND ${key} = $${paramIndex}`;
          params.push(value);
          paramIndex++;
        }
      }
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Create a record
   */
  async create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
    const columns = ["tenant_id", ...Object.keys(data)];
    const values = [this.tenantId, ...Object.values(data)];
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    const columnNames = columns.map((col) => this.camelToSnake(col)).join(", ");

    const sql = `INSERT INTO ${this.tableName} (${columnNames})
                 VALUES (${placeholders})
                 RETURNING *`;

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      throw new Error(`Failed to create record in ${this.tableName}`);
    }

    return this.convertFromDb(result.rows[0]);
  }

  /**
   * Update a record
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return this.findById(id);
    }

    let sql = `UPDATE ${this.tableName} SET `;
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of entries) {
      if (key === "id" || key === "tenantId") continue;
      sql += `${this.camelToSnake(key)} = $${paramIndex}, `;
      params.push(value);
      paramIndex++;
    }

    // Add updated_at
    sql += `updated_at = CURRENT_TIMESTAMP `;

    sql += `WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`;
    params.push(id, this.tenantId);

    sql += " RETURNING *";

    const result = await query(sql, params);
    return result.rows.length > 0 ? this.convertFromDb(result.rows[0]) : null;
  }

  /**
   * Delete a record (soft or hard delete)
   */
  async delete(id: string, soft = false): Promise<boolean> {
    if (soft) {
      // Soft delete - set deleted_at timestamp
      const result = await query(
        `UPDATE ${this.tableName} SET deleted_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2`,
        [id, this.tenantId],
      );
      return result.rowCount! > 0;
    } else {
      // Hard delete
      const result = await query(
        `DELETE FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2`,
        [id, this.tenantId],
      );
      return result.rowCount! > 0;
    }
  }

  /**
   * Execute raw query with automatic tenant scoping
   * Use with care - make sure to include tenant_id in WHERE clause
   */
  async executeScoped(sql: string, params: any[] = []): Promise<QueryResult> {
    // Append tenant filter to WHERE clause if not already present
    if (!sql.includes("tenant_id")) {
      const whereIndex = sql.toUpperCase().indexOf("WHERE");
      if (whereIndex > -1) {
        sql =
          sql.slice(0, whereIndex + 5) +
          `tenant_id = $1 AND ` +
          sql.slice(whereIndex + 5);
        params.unshift(this.tenantId);
      }
    }

    return query(sql, params);
  }

  /**
   * Pagination helper
   */
  async paginate(
    pageNumber: number = 1,
    pageSize: number = 10,
    filters?: Record<string, any>,
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
  }> {
    const offset = (pageNumber - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.findAll({ limit: pageSize, offset, filters }),
      this.count(filters),
    ]);

    return {
      data,
      total,
      page: pageNumber,
      pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Utility: Convert camelCase to snake_case
   */
  protected camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Utility: Convert database row to entity (snake_case → camelCase)
   */
  protected convertFromDb(row: any): T {
    const result: any = {};

    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      result[camelKey] = value;
    }

    return result as T;
  }

  /**
   * Bulk operations
   */
  async createMany(
    dataArray: Array<Omit<T, "id" | "createdAt" | "updatedAt">>,
  ): Promise<T[]> {
    const results: T[] = [];

    for (const data of dataArray) {
      const result = await this.create(data);
      results.push(result);
    }

    return results;
  }

  /**
   * Get tenant ID for this repository
   */
  getTenantId(): string {
    return this.tenantId;
  }
}

/**
 * Example: Student Repository
 * This shows how to extend BaseRepository for specific entities
 */
export class StudentRepository extends BaseRepository<any> {
  constructor(tenantId: string) {
    super("students", tenantId);
  }

  async getByAdmissionNumber(admissionNumber: string) {
    // Automatically scoped to tenant
    return this.findOne({ admission_number: admissionNumber });
  }

  async getActiveStudents(limit?: number, offset?: number) {
    return this.findAll({
      filters: { status: "active" },
      limit,
      offset,
      orderBy: "admission_date DESC",
    });
  }

  async getStudentsByClass(classId: string) {
    return this.findAll({
      filters: { class_id: classId, status: "active" },
    });
  }
}

/**
 * Example: Teacher Repository
 */
export class TeacherRepository extends BaseRepository<any> {
  constructor(tenantId: string) {
    super("teachers", tenantId);
  }

  async getActiveTeachers() {
    return this.findAll({
      filters: { status: "active" },
      orderBy: "created_at DESC",
    });
  }

  async getTeachersByDepartment(department: string) {
    return this.findAll({
      filters: { department, status: "active" },
    });
  }
}

/**
 * Example: Class Repository
 */
export class ClassRepository extends BaseRepository<any> {
  constructor(tenantId: string) {
    super("classes", tenantId);
  }

  async getActiveClasses() {
    return this.findAll({
      filters: { status: "active" },
      orderBy: "name ASC",
    });
  }

  async getClassesByAcademicYear(academicYearId: string) {
    return this.findAll({
      filters: { academic_year_id: academicYearId },
      orderBy: "name ASC",
    });
  }
}
