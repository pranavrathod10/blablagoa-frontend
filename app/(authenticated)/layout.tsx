"use client";

import Navbar from "@/components/navbar";
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback() {
  return (
    <div className="flex items-center justify-center min-h-64 text-center">
      <div>
        <p className="font-medium text-gray-900 mb-2">Something went wrong</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-blue-600"
        >
          Refresh page
        </button>
      </div>
    </div>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
