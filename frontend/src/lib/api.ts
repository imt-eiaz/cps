import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    // Only access localStorage in browser environment
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log(
          `[API] Request to ${config.url} with token:`,
          token.substring(0, 50) + "...",
        );
      } else {
        console.log(`[API] Request to ${config.url} WITHOUT token`);
      }
    } else {
      console.log(
        `[API] Server-side request to ${config.url} - skipping token`,
      );
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || "";

    // Only logout on actual token authentication errors, not authorization errors
    const isTokenError =
      (status === 401 && message.includes("token")) ||
      (status === 401 && message.includes("Access token required")) ||
      (status === 401 && message.includes("Invalid or expired token"));

    if (isTokenError) {
      // Token expired or invalid, logout user
      if (typeof window !== "undefined") {
        console.log("[API] Token expired/invalid - redirecting to login");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/auth/login";
      }
    } else if (status === 403) {
      // 403 is usually a permission issue, not a token issue - don't auto-logout
      console.log("[API] Access denied (insufficient permissions):", message);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
