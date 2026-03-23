"use client";

import { useUser, useAuth, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getMyProfile, registerUser, User } from "@/lib/api";

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!isLoaded || !user) return;
      try {
        const token = await getToken();
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
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [isLoaded, user, getToken]);

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Welcome, {profile?.name}</h1>
        <SignOutButton>
          <button className="text-sm text-gray-500 hover:text-red-500 transition">
            Sign out
          </button>
        </SignOutButton>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
        <div className="space-y-2 text-gray-600">
          <p>
            <span className="font-medium">Email:</span> {profile?.email}
          </p>
          <p>
            <span className="font-medium">Bio:</span>{" "}
            {profile?.bio || "Not set yet"}
          </p>
          <p>
            <span className="font-medium">Discoverable:</span>{" "}
            {profile?.is_discoverable ? "Yes" : "No"}
          </p>
          <p>
            <span className="font-medium">Discovery radius:</span>{" "}
            {profile?.discovery_radius_km} km
          </p>
        </div>
      </div>
    </main>
  );
}
