"use client";

import { useUser, useAuth, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getMyProfile, registerUser, User } from "@/lib/api";
import Link from "next/link";

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!isLoaded || !user) return;

      try {
        const token = await getToken({ skipCache: true });
        if (!token) return;

        try {
          const data = await getMyProfile(token);
          setProfile(data);
        } catch {
          const data = await registerUser(token, {
            email: user.emailAddresses[0].emailAddress,
            name: user.fullName || user.firstName || "User",
          });
          setProfile(data);
        }
      } catch (err) {
        setError("Failed to load profile. Please refresh.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [isLoaded, user, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.name} 👋
        </h1>
        <p className="text-gray-500 mt-1">Ready to meet someone nearby?</p>
      </div>

      {/* Quick action */}
      <Link
        href="/connect"
        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
      >
        Find people nearby
      </Link>

      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Your profile
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">
              {profile?.email}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Bio</span>
            <span className="text-sm font-medium text-gray-900">
              {profile?.bio || "Not set yet"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Discovery radius</span>
            <span className="text-sm font-medium text-gray-900">
              {profile?.discovery_radius_km} km
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Discoverable</span>
            <span
              className={`text-sm font-medium ${
                profile?.is_discoverable ? "text-green-600" : "text-gray-400"
              }`}
            >
              {profile?.is_discoverable ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
