"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile, User } from "@/lib/api";

export default function ProfilePage() {
  const { getToken } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — local copy of profile
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [dob, setDob] = useState("");
  const [discoverable, setDiscoverable] = useState(true);

  // Load profile once on mount
  useEffect(() => {
    async function load() {
      try {
        const token = await getToken({ skipCache: true });
        if (!token) return;
        const data = await getMyProfile(token);
        setProfile(data);
        populateForm(data);
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getToken]);

  function populateForm(data: User) {
    setName(data.name || "");
    setBio(data.bio || "");
    setDob(data.date_of_birth || "");
    setDiscoverable(data.is_discoverable);
  }

  // Check if anything actually changed
  function hasChanges(): boolean {
    if (!profile) return false;
    return (
      name.trim() !== profile.name ||
      bio.trim() !== (profile.bio || "") ||
      dob !== (profile.date_of_birth || "") ||
      discoverable !== profile.is_discoverable
    );
  }

  // Validate before saving
  function validate(): string | null {
    if (!name.trim()) return "Name cannot be empty.";
    if (name.trim().length < 2) return "Name must be at least 2 characters.";
    if (bio.length > 200) return "Bio cannot exceed 200 characters.";
    return null;
  }

  async function handleSave() {
    setError(null);

    // Skip API if nothing changed
    if (!hasChanges()) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    // Validate
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) return;

      const updated = await updateMyProfile(token, {
        name: name.trim(),
        bio: bio.trim() || null,
        date_of_birth: dob || null,
        is_discoverable: discoverable,
      });

      // Update stored profile with new values
      setProfile(updated);
      populateForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (profile) populateForm(profile);
    setError(null);
  }

  function getAge(dobStr: string): number | null {
    if (!dobStr) return null;
    const today = new Date();
    const birth = new Date(dobStr);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  const dirty = hasChanges();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1 text-sm">
          This is what others see when you appear in their nearby list
        </p>
      </div>

      {/* Live preview */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Preview
        </p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl shrink-0">
            {name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">
              {name || "Your name"}
              {dob && getAge(dob) !== null && (
                <span className="font-normal text-gray-400 text-sm ml-2">
                  {getAge(dob)} years old
                </span>
              )}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">
              {bio || "No bio yet"}
            </p>
          </div>
          <div>
            {discoverable ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Visible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                Hidden
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Edit details</h2>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others a bit about yourself..."
            rows={3}
            maxLength={200}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors resize-none"
          />
          <p
            className={`text-xs text-right ${bio.length > 180 ? "text-orange-500" : "text-gray-400"}`}
          >
            {bio.length}/200
          </p>
        </div>

        {/* Date of birth */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Date of birth
          </label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-400 transition-colors"
          />
          {dob && getAge(dob) !== null && (
            <p className="text-xs text-gray-400">
              You are {getAge(dob)} years old
            </p>
          )}
        </div>

        {/* Discoverable toggle */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Appear in nearby list
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {discoverable
                ? "Others can find you on the Connect page"
                : "You are completely hidden from others"}
            </p>
          </div>
          <button
            onClick={() => setDiscoverable(!discoverable)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              discoverable ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                discoverable ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {dirty && (
            <button
              onClick={handleDiscard}
              className="flex-1 border border-gray-200 text-gray-500 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 ${
              saved
                ? "bg-green-500 text-white"
                : dirty
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : saved ? (
              "Saved!"
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Account info</h2>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500">Email</span>
          <span className="text-sm font-medium text-gray-900">
            {profile?.email}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500">Discovery radius</span>
          <span className="text-sm font-medium text-gray-900">
            {profile?.discovery_radius_km} km
            <span className="text-gray-400 font-normal ml-1">
              (set on Connect page)
            </span>
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-500">Member since</span>
          <span className="text-sm font-medium text-gray-900">
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
