"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LoginFormData, SignupFormData } from "../types";
import apiClient from "../lib/api";

export const useAuth = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(
    async (data: LoginFormData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.post("/auth/login", data);
        const { user, token } = response.data.data;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);

        router.push("/dashboard");
      } catch (err: any) {
        const message =
          err.response?.data?.message || "Login failed. Please try again.";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const signup = useCallback(
    async (data: SignupFormData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.post("/auth/signup", data);
        const { user, token } = response.data.data;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);

        router.push("/dashboard");
      } catch (err: any) {
        const message =
          err.response?.data?.message || "Signup failed. Please try again.";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await apiClient.post("/auth/logout");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      router.push("/auth/login");
    } catch (err: any) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };
};
