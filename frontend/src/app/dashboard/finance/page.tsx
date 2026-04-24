"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  FileText,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import apiClient from "@/lib/api";

interface DashboardStats {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueInvoices: number;
  completedPayments: number;
}

export default function FinancePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueInvoices: 0,
    completedPayments: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, paymentsRes] = await Promise.all([
        apiClient.get("/finance/invoices?limit=5"),
        apiClient.get("/finance/payments?limit=5"),
      ]);

      const invoices = invoicesRes.data.data || [];
      const payments = paymentsRes.data.data || [];

      // Calculate statistics
      const totalAmount = invoices.reduce(
        (sum: number, inv: any) => sum + parseFloat(inv.total_amount || 0),
        0,
      );
      const paidAmount = invoices.reduce(
        (sum: number, inv: any) => sum + parseFloat(inv.paid_amount || 0),
        0,
      );
      const pendingAmount = totalAmount - paidAmount;
      const overdueInvoices = invoices.filter(
        (inv: any) => inv.status === "overdue" || inv.status === "partial",
      ).length;

      setStats({
        totalInvoices: invoices.length,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueInvoices,
        completedPayments: payments.filter((p: any) => p.status === "completed")
          .length,
      });

      setRecentInvoices(invoices);
      setRecentPayments(payments);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch finance data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold text-gray-800">Finance Management</h1>
        <p className="text-gray-600 mt-2">
          Manage fees, invoices, and payment tracking
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading finance data...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
                <DollarSign size={32} className="text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Paid Amount</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(stats.paidAmount)}
                  </p>
                </div>
                <TrendingUp size={32} className="text-green-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Amount</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(stats.pendingAmount)}
                  </p>
                </div>
                <FileText size={32} className="text-yellow-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Overdue Invoices</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.overdueInvoices}
                  </p>
                </div>
                <CreditCard size={32} className="text-red-500 opacity-50" />
              </div>
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link
              href="/dashboard/finance/fee-structures"
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-600 rounded-lg">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Fee Structures
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Manage fee categories and amounts
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/finance/invoices"
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <FileText size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Invoices
                  </h3>
                  <p className="text-gray-600 text-sm">
                    View and manage student invoices
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/finance/payments"
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-600 rounded-lg">
                  <CreditCard size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Payments
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Track payment transactions
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Invoices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Recent Invoices
              </h2>
              {recentInvoices.length > 0 ? (
                <div className="space-y-3">
                  {recentInvoices.map((invoice: any) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {invoice.invoice_number}
                        </p>
                        <p className="text-sm text-gray-600">
                          {invoice.student_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                            invoice.status,
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No recent invoices</p>
              )}
              <Link
                href="/dashboard/finance/invoices"
                className="mt-4 block text-center text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Invoices →
              </Link>
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Recent Payments
              </h2>
              {recentPayments.length > 0 ? (
                <div className="space-y-3">
                  {recentPayments.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {payment.invoice_number}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">
                          {formatCurrency(payment.amount)}
                        </p>
                        <span className="text-xs text-gray-600 font-medium">
                          {payment.payment_method}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No recent payments</p>
              )}
              <Link
                href="/dashboard/finance/payments"
                className="mt-4 block text-center text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Payments →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
