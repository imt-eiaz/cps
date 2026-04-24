import React, { createContext, useContext, useEffect, useState } from "react";

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  status: "active" | "inactive" | "suspended";
}

export interface TenantContextType {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
  subdomain: string | null;
  apiBaseUrl: string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

/**
 * Extracts subdomain from current domain
 * Supports:
 * - Production: school1.ventionz.com → "school1"
 * - Local dev: school1.localhost:3000 → "school1"
 * - No subdomain: localhost:3000 → null
 */
function extractSubdomain(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hostname = window.location.hostname;

  // Check if localhost or IP
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // For local dev, check query param or session storage
    const params = new URLSearchParams(window.location.search);
    const subdomain = params.get("tenant") || sessionStorage.getItem("tenant");
    return subdomain;
  }

  // Split by dots
  const parts = hostname.split(".");

  // If one part, no subdomain
  if (parts.length <= 1) {
    return null;
  }

  // Return first part (subdomain)
  return parts[0];
}

/**
 * Builds API base URL for multi-tenant system
 * Production: https://school1.ventionz.com/api
 * Local dev: http://localhost:5000/api?tenant=school1
 */
function buildApiBaseUrl(subdomain: string | null): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // If external API is configured, use it
  const externalApi = process.env.NEXT_PUBLIC_API_URL;
  if (externalApi && externalApi.includes("://")) {
    // Check if external API includes tenant parameter for local dev
    if (externalApi.includes("localhost") && subdomain) {
      return `${externalApi}?tenant=${subdomain}`;
    }
    return externalApi;
  }

  // If we have a subdomain, build subdomain-based URL
  if (subdomain && !hostname.includes("localhost")) {
    // Remove existing subdomain and add the tenant subdomain
    const domain = hostname.split(".").slice(1).join(".");
    return `${protocol}//${subdomain}.${domain}/api`;
  }

  // For localhost, include tenant in query param
  if (hostname === "localhost" && subdomain) {
    return `http://localhost:5000/api?tenant=${subdomain}`;
  }

  // Fallback
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
}

/**
 * Provider component wrapper
 */
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subdomain = extractSubdomain();
  const apiBaseUrl = buildApiBaseUrl(subdomain);

  useEffect(() => {
    if (!subdomain) {
      setError("No subdomain detected");
      setLoading(false);
      return;
    }

    // Fetch tenant info from backend
    // This verifies the tenant exists and is active
    const fetchTenant = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/tenants/info`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTenant(data.data);
        } else {
          setError("Failed to load tenant information");
        }
      } catch (err) {
        console.error("Error fetching tenant:", err);
        setError("Unable to connect to server");
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [subdomain, apiBaseUrl]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        loading,
        error,
        subdomain,
        apiBaseUrl,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to use tenant context
 */
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}

/**
 * Hook to get just the API base URL
 */
export function useApiBaseUrl(): string {
  const { apiBaseUrl } = useTenant();
  return apiBaseUrl;
}

/**
 * Hook to get just the subdomain
 */
export function useSubdomain(): string | null {
  const { subdomain } = useTenant();
  return subdomain;
}

/**
 * Hook to get just the tenant info
 */
export function useTenantInfo(): TenantInfo | null {
  const { tenant } = useTenant();
  return tenant;
}

/**
 * Wrapper for pages that require tenant context
 * Shows loading or error states automatically
 */
export function withTenant<P extends object>(
  Component: React.ComponentType<P>,
  requireActive = true,
) {
  return function WrappedComponent(props: P) {
    const { tenant, loading, error } = useTenant();

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading school information...</p>
          </div>
        </div>
      );
    }

    if (error || (!tenant && requireActive)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Unable to Load School
            </h1>
            <p className="text-gray-600 mb-4">
              {error || "Please access from your school domain"}
            </p>
            <p className="text-sm text-gray-500">
              Contact your school administrator if this problem persists
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
