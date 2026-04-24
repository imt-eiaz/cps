import axios, { AxiosInstance, AxiosError } from "axios";

/**
 * Multi-Tenant API Client
 *
 * This client automatically:
 * 1. Detects the current tenant from the subdomain
 * 2. Routes requests to the correct tenant-specific API
 * 3. Includes tenant context in all requests
 * 4. Handles tenant-specific authentication
 */

let apiClient: AxiosInstance | null = null;

/**
 * Initialize API client for multi-tenant system
 * Should be called in app root layout
 */
export function initializeApiClient(baseURL: string): AxiosInstance {
  if (apiClient) {
    return apiClient;
  }

  apiClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor - add tenant context
  apiClient.interceptors.request.use(
    (config) => {
      // Only access localStorage in browser environment
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Debug logging (optional)
        if (process.env.NODE_ENV === "development") {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
            hasToken: !!token,
          });
        }
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // Response interceptor - handle tenant-specific errors
  apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;
      const message = (error.response?.data as any)?.message || "";

      // Handle tenant-not-found error
      if (status === 400 && message.includes("Invalid tenant")) {
        if (typeof window !== "undefined") {
          console.log(
            "[API] Tenant context invalid - redirecting to domain selection",
          );
          window.location.href = "/";
        }
      }

      // Handle token expiration
      if (
        status === 401 &&
        (message.includes("token") || message.includes("Access token required"))
      ) {
        if (typeof window !== "undefined") {
          console.log("[API] Token expired - redirecting to login");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          const subdomain = getSubdomainFromPath();
          window.location.href = `http://${subdomain || "admin"}.localhost:3000/auth/login`;
        }
      }

      // Handle permission denied
      if (status === 403) {
        console.warn("[API] Access denied:", message);
      }

      // Handle rate limiting
      if (status === 429) {
        console.warn("[API] Rate limit exceeded");
      }

      return Promise.reject(error);
    },
  );

  return apiClient;
}

/**
 * Get the initialized API client
 * If not initialized, creates a default one
 */
export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    const baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    return initializeApiClient(baseURL);
  }
  return apiClient;
}

/**
 * Extract subdomain from current path for redirects
 */
function getSubdomainFromPath(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const params = new URLSearchParams(window.location.search);
    return params.get("tenant") || sessionStorage.getItem("tenant");
  }

  const parts = hostname.split(".");
  return parts.length > 1 ? parts[0] : null;
}

/**
 * API Client Hook for React components
 * Returns axios instance with tenant context
 */
export function useApiClient(): AxiosInstance {
  return getApiClient();
}

/**
 * Convenience methods for common operations
 */
export const apiService = {
  /**
   * GET request
   */
  async get<T = any>(url: string, config?: any): Promise<T> {
    const client = getApiClient();
    const response = await client.get<{ data: T }>(url, config);
    return response.data.data;
  },

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const client = getApiClient();
    const response = await client.post<{ data: T }>(url, data, config);
    return response.data.data;
  },

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const client = getApiClient();
    const response = await client.put<{ data: T }>(url, data, config);
    return response.data.data;
  },

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const client = getApiClient();
    const response = await client.patch<{ data: T }>(url, data, config);
    return response.data.data;
  },

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: any): Promise<T> {
    const client = getApiClient();
    const response = await client.delete<{ data: T }>(url, config);
    return response.data.data;
  },

  /**
   * Multi-tenant auth endpoints
   */
  auth: {
    login(email: string, password: string) {
      return apiService.post("/auth/login", { email, password });
    },

    signup(data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      roleId?: string;
    }) {
      return apiService.post("/auth/signup", data);
    },

    getCurrentUser() {
      return apiService.get("/auth/me");
    },

    logout() {
      return apiService.post("/auth/logout");
    },
  },

  /**
   * Students endpoints (automatically tenant-scoped)
   */
  students: {
    getAll(page = 1, limit = 10) {
      return apiService.get(`/students?page=${page}&limit=${limit}`);
    },

    getById(id: string) {
      return apiService.get(`/students/${id}`);
    },

    getProfile() {
      return apiService.get("/students/me");
    },

    create(data: any) {
      return apiService.post("/students", data);
    },

    update(id: string, data: any) {
      return apiService.patch(`/students/${id}`, data);
    },

    delete(id: string) {
      return apiService.delete(`/students/${id}`);
    },

    getByClass(classId: string) {
      return apiService.get(`/students/class/${classId}`);
    },

    getStats() {
      return apiService.get("/students/stats");
    },
  },

  /**
   * Teachers endpoints
   */
  teachers: {
    getAll(page = 1, limit = 10) {
      return apiService.get(`/teachers?page=${page}&limit=${limit}`);
    },

    getById(id: string) {
      return apiService.get(`/teachers/${id}`);
    },

    create(data: any) {
      return apiService.post("/teachers", data);
    },

    update(id: string, data: any) {
      return apiService.patch(`/teachers/${id}`, data);
    },

    delete(id: string) {
      return apiService.delete(`/teachers/${id}`);
    },
  },

  /**
   * Classes endpoints
   */
  classes: {
    getAll(page = 1, limit = 10) {
      return apiService.get(`/classes?page=${page}&limit=${limit}`);
    },

    getById(id: string) {
      return apiService.get(`/classes/${id}`);
    },

    create(data: any) {
      return apiService.post("/classes", data);
    },

    update(id: string, data: any) {
      return apiService.patch(`/classes/${id}`, data);
    },

    delete(id: string) {
      return apiService.delete(`/classes/${id}`);
    },
  },

  /**
   * Attendance endpoints
   */
  attendance: {
    getAll(page = 1, limit = 10) {
      return apiService.get(`/attendance?page=${page}&limit=${limit}`);
    },

    mark(data: any) {
      return apiService.post("/attendance", data);
    },

    getReport(startDate: string, endDate: string) {
      return apiService.get(
        `/attendance/report?startDate=${startDate}&endDate=${endDate}`,
      );
    },
  },

  /**
   * Exams endpoints
   */
  exams: {
    getAll(page = 1, limit = 10) {
      return apiService.get(`/exams?page=${page}&limit=${limit}`);
    },

    getById(id: string) {
      return apiService.get(`/exams/${id}`);
    },

    create(data: any) {
      return apiService.post("/exams", data);
    },

    update(id: string, data: any) {
      return apiService.patch(`/exams/${id}`, data);
    },
  },

  /**
   * Marks endpoints
   */
  marks: {
    getByExam(examId: string) {
      return apiService.get(`/marks/exam/${examId}`);
    },

    submit(data: any) {
      return apiService.post("/marks", data);
    },

    update(id: string, data: any) {
      return apiService.patch(`/marks/${id}`, data);
    },
  },

  /**
   * Admin/Super Admin endpoints
   */
  admin: {
    /**
     * Super Admin: Tenant Management
     */
    tenants: {
      create(data: any) {
        return apiService.post("/admin/tenants", data);
      },

      getAll(status?: string) {
        const query = status ? `?status=${status}` : "";
        return apiService.get(`/admin/tenants${query}`);
      },

      getById(tenantId: string) {
        return apiService.get(`/admin/tenants/${tenantId}`);
      },

      getDetails(tenantId: string) {
        return apiService.get(`/admin/tenants/${tenantId}/details`);
      },

      updateSettings(tenantId: string, data: any) {
        return apiService.patch(`/admin/tenants/${tenantId}/settings`, data);
      },

      updateStatus(tenantId: string, status: string) {
        return apiService.patch(`/admin/tenants/${tenantId}/status`, {
          status,
        });
      },

      updateSubscription(tenantId: string, data: any) {
        return apiService.patch(
          `/admin/tenants/${tenantId}/subscription`,
          data,
        );
      },

      delete(tenantId: string) {
        return apiService.delete(`/admin/tenants/${tenantId}`);
      },

      getAnalytics(tenantId: string) {
        return apiService.get(`/admin/tenants/${tenantId}/analytics`);
      },
    },

    /**
     * Super Admin: Analytics
     */
    analytics: {
      getPlatformStats() {
        return apiService.get("/admin/analytics/platform");
      },
    },

    /**
     * Super Admin: Admin Management
     */
    superAdmins: {
      create(userId: string) {
        return apiService.post("/admin/super-admins", { userId });
      },

      getAll() {
        return apiService.get("/admin/super-admins");
      },

      revoke(userId: string) {
        return apiService.delete(`/admin/super-admins/${userId}`);
      },
    },
  },
};

/**
 * Export for convenience
 */
export default apiService;
