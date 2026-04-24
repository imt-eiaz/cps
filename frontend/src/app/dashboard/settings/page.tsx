"use client";

import Link from "next/link";
import { ArrowLeft, Settings, Wrench, Clock } from "lucide-react";

export default function SettingsPage() {
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
        <h1 className="text-4xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-2">Configure your system preferences</p>
      </div>

      {/* Under Construction Section */}
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Settings className="text-gray-300" size={120} />
              <Wrench
                className="text-blue-600 absolute -bottom-2 -right-2 animate-bounce"
                size={48}
              />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Page Under Construction
          </h2>

          <p className="text-gray-600 mb-6">
            We're working hard to bring you an amazing settings experience. This
            page will be available soon with features including:
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <ul className="text-left space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Profile settings and account management</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 mt-1">✓</span>
                <span>System preferences and configurations</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Security and privacy controls</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Notification preferences</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Theme and appearance customization</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Clock size={16} />
            <span>Check back soon for updates!</span>
          </div>

          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
