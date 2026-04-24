"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import apiClient from "@/lib/api";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  notes: string;
  student_name: string;
  student_email: string;
  admission_number: string;
  year_name: string;
  items?: any[];
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  status: string;
  remarks: string;
}

export default function InvoiceDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInvoiceDetails();
  }, [params.id]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const [invoiceRes, paymentsRes] = await Promise.all([
        apiClient.get(`/finance/invoices/${params.id}`),
        apiClient.get(`/finance/invoices/${params.id}/payments`),
      ]);
      setInvoice(invoiceRes.data.data);
      setPayments(paymentsRes.data.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch invoice details",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
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
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6">
        <Link
          href="/dashboard/finance/invoices"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Invoices
        </Link>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || "Invoice not found"}
        </div>
      </div>
    );
  }

  const remainingAmount = invoice.total_amount - invoice.paid_amount;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/finance/invoices"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Invoices
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              {invoice.invoice_number}
            </h1>
            <p className="text-gray-600 mt-2">
              Created on {formatDate(invoice.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg flex items-center gap-2">
              <Download size={20} />
              Download
            </button>
            <button className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg">
              <Edit size={20} />
            </button>
            <button className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg">
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6 flex gap-4 items-center">
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
            invoice.status,
          )}`}
        >
          Status: {invoice.status.toUpperCase()}
        </span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - Invoice Details */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Invoice Details
          </h2>

          {/* Invoice and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-gray-600 text-sm mb-2">Invoice Number</p>
              <p className="text-lg font-semibold text-gray-900">
                {invoice.invoice_number}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-2">Academic Year</p>
              <p className="text-lg font-semibold text-gray-900">
                {invoice.year_name}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-2">Invoice Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(invoice.invoice_date)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-2">Due Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(invoice.due_date)}
              </p>
            </div>
          </div>

          {/* Student Information */}
          <div className="border-t border-gray-200 pt-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Student Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-600 text-sm mb-2">Name</p>
                <p className="text-gray-900 font-semibold">
                  {invoice.student_name}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-2">Email</p>
                <p className="text-gray-900">{invoice.student_email}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-2">Admission Number</p>
                <p className="text-gray-900 font-semibold">
                  {invoice.admission_number}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          {invoice.items && invoice.items.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Invoice Items
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">
                        Description
                      </th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="px-4 py-2 text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-600">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900 font-semibold">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <p className="text-gray-600 text-sm mb-2">Notes</p>
              <p className="text-gray-900">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Payment Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Payment Summary
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-600">Total Amount</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-600">Paid Amount</span>
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(invoice.paid_amount)}
                </span>
              </div>

              <div className="flex justify-between items-center bg-red-50 p-3 rounded">
                <span className="text-gray-700 font-medium">Remaining</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </div>

            {remainingAmount > 0 && (
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 mb-4">
                <Plus size={20} />
                Record Payment
              </button>
            )}

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <p>
                {invoice.status === "paid"
                  ? "✓ Invoice is fully paid"
                  : `Payment Status: ${invoice.status}`}
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Payment History
            </h2>

            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-gray-200 rounded p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getPaymentStatusColor(
                          payment.status,
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {payment.payment_method}
                      {payment.transaction_id && ` • ${payment.transaction_id}`}
                    </p>
                    {payment.remarks && (
                      <p className="text-xs text-gray-600 mt-1">
                        {payment.remarks}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">No payments recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
