"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import apiClient from "@/lib/api";

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  subject?: Subject | null;
}

interface SubjectFormData {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

const initialFormData: SubjectFormData = {
  name: "",
  code: "",
  description: "",
  isActive: true,
};

export default function SubjectModal({
  isOpen,
  onClose,
  onSaved,
  subject,
}: SubjectModalProps) {
  const [formData, setFormData] = useState<SubjectFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (subject) {
      setFormData({
        name: subject.name,
        code: subject.code,
        description: subject.description || "",
        isActive: subject.isActive,
      });
    } else {
      setFormData(initialFormData);
    }

    setError("");
  }, [isOpen, subject]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = () => {
    setFormData((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const validate = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      setError("Subject name and code are required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        isActive: formData.isActive,
      };

      if (subject?.id) {
        await apiClient.put(`/academic/subjects/${subject.id}`, payload);
      } else {
        await apiClient.post("/academic/subjects", payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save subject");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {subject ? "Edit Subject" : "Add Subject"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
            title="Close dialog"
            aria-label="Close dialog"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Mathematics"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="MATH101"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional subject description"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">Active</p>
              <p className="text-sm text-gray-500">
                Enable or disable this subject
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={loading}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                formData.isActive ? "bg-blue-600" : "bg-gray-300"
              }`}
              title="Toggle active status"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  formData.isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60"
            >
              {loading
                ? "Saving..."
                : subject
                  ? "Update Subject"
                  : "Create Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
