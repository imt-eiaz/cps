"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, Edit, Trash2 } from "lucide-react";
import apiClient from "@/lib/api";

interface FeeStructure {
  id: string;
  amount: number;
  frequency: string;
  due_date: string;
  description: string;
  category_name: string;
  class_name: string;
  section_name: string;
  year_name: string;
}

export default function FeeStructuresPage() {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchFeeStructures();
  }, [page]);

  const fetchFeeStructures = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/finance/fee-structures?page=${page}&limit=10`,
      );
      const data = response.data.data;
      setFeeStructures(data);
      setTotalPages(response.data.pagination.pages);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch fee structures");
    } finally {
      setLoading(false);
    }
  };

  const filteredStructures = feeStructures.filter(
    (structure) =>
      structure.category_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (structure.class_name &&
        structure.class_name.toLowerCase().includes(searchTerm.toLowerCase())),
  );

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
      month: "short",
      day: "numeric",
    });
  };

  const frequencyBadgeColor = (frequency: string) => {
    switch (frequency) {
      case "monthly":
        return "bg-blue-100 text-blue-800";
      case "quarterly":
        return "bg-purple-100 text-purple-800";
      case "semester":
        return "bg-green-100 text-green-800";
      case "yearly":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/finance"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Finance
        </Link>
        <h1 className="text-4xl font-bold text-gray-800">Fee Structures</h1>
        <p className="text-gray-600 mt-2">
          Manage all fee categories and amounts
        </p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by category or class..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={20} />
          Add Fee Structure
        </button>
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
          <p className="text-gray-600 mt-4">Loading fee structures...</p>
        </div>
      )}

      {/* Fee Structures Grid */}
      {!loading && filteredStructures.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filteredStructures.map((structure) => (
            <div
              key={structure.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">
                    {structure.category_name}
                  </h3>
                  {structure.class_name && (
                    <p className="text-sm text-gray-600">
                      {structure.class_name} {structure.section_name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600 hover:text-blue-800 p-1">
                    <Edit size={18} />
                  </button>
                  <button className="text-red-600 hover:text-red-800 p-1">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Amount</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(structure.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Frequency</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${frequencyBadgeColor(
                      structure.frequency,
                    )}`}
                  >
                    {structure.frequency.charAt(0).toUpperCase() +
                      structure.frequency.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Academic Year</span>
                  <span className="font-medium text-gray-800 text-sm">
                    {structure.year_name}
                  </span>
                </div>
              </div>

              {structure.description && (
                <div className="p-3 bg-gray-50 rounded mb-4">
                  <p className="text-sm text-gray-700">
                    {structure.description}
                  </p>
                </div>
              )}

              {structure.due_date && (
                <p className="text-xs text-gray-500">
                  Due Date: {formatDate(structure.due_date)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredStructures.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 text-lg">
            {feeStructures.length === 0
              ? "No fee structures found"
              : "No fee structures match your search"}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-4 py-2 rounded-lg ${
                page === p
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
