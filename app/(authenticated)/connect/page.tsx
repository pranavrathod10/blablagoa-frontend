"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  updateLocation,
  updatePresence,
  getNearbyUsers,
  updateDiscoverySettings,
  NearbyUser,
} from "@/lib/api";

async function getLocationName(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } },
    );
    const data = await response.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.suburb ||
      data.address?.state ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    );
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function ConnectPage() {
  const { getToken } = useAuth();

  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [radius, setRadius] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");
  // const radiusDebounceRef = useRef<NodeJS.Timeout>();
  const radiusDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Heartbeat
  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function heartbeat() {
      try {
        const token = await getToken({ skipCache: true });
        if (token) await updatePresence(token);
      } catch {
        // silent fail
      }
    }

    heartbeat();
    interval = setInterval(heartbeat, 30000);
    return () => clearInterval(interval);
  }, [getToken]);

  // Fetch nearby users
  const fetchNearbyUsers = useCallback(
    async (token?: string) => {
      setFetchingUsers(true);
      try {
        const t = token || (await getToken({ skipCache: true }));
        if (!t) return;
        const users = await getNearbyUsers(t);
        setNearbyUsers(users);
      } catch {
        setError("Failed to fetch nearby users.");
      } finally {
        setFetchingUsers(false);
      }
    },
    [getToken],
  );

  // Use GPS
  async function useCurrentLocation() {
    setError(null);
    setLoading(true);

    if (!navigator.geolocation) {
      setError("Your browser doesn't support location.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const token = await getToken({ skipCache: true });
          if (!token) return;
          await updateLocation(token, latitude, longitude);
          const name = await getLocationName(latitude, longitude);
          setLocationName(name);
          setLocationSet(true);
          await fetchNearbyUsers(token);
        } catch {
          setError("Failed to update location.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError(
          "Location access denied. If you're in incognito mode, " +
            "location is blocked by default. Please use a regular " +
            "browser window and allow location when prompted.",
        );
        setLoading(false);
      },
    );
  }

  // Radius change with debounce
  function handleRadiusChange(newRadius: number) {
    setRadius(newRadius);

    if (radiusDebounceRef.current) {
      clearTimeout(radiusDebounceRef.current);
    }

    radiusDebounceRef.current = setTimeout(async () => {
      const token = await getToken({ skipCache: true });
      if (!token) return;
      await updateDiscoverySettings(token, { discovery_radius_km: newRadius });
      if (locationSet) await fetchNearbyUsers(token);
    }, 500);
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left panel */}
      <div className="w-72 shrink-0 bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Find people nearby
          </h2>
          <p className="text-sm text-gray-400">
            Set your location to see who is online around you
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Your location
          </label>

          {locationSet ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
              <span className="text-xs text-green-700 font-medium truncate">
                {locationName}
              </span>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-400">Not set</span>
            </div>
          )}

          <button
            onClick={useCurrentLocation}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-blue-200 text-blue-600 text-sm font-medium py-2.5 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Use current location"
            )}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Discovery radius
            </label>
            <span className="text-sm font-bold text-blue-600">{radius} km</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={radius}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {locationSet && (
          <button
            onClick={() => fetchNearbyUsers()}
            className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors mt-auto"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {locationSet
              ? `${nearbyUsers.length} ${nearbyUsers.length === 1 ? "person" : "people"} nearby`
              : "Set your location to see who is nearby"}
          </h2>
          {locationSet && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </div>
          )}
        </div>

        {!locationSet ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-4xl mb-4">📍</div>
            <p className="text-gray-500 text-sm max-w-xs">
              Click "Use current location" to find people around you
            </p>
          </div>
        ) : fetchingUsers ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : nearbyUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-500 text-sm max-w-xs">
              No one online within {radius} km right now. Try increasing your
              radius.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                  {u.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">
                      {u.name}
                    </p>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {u.bio || "No bio yet"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-medium text-gray-500">
                    {u.distance_km} km
                  </span>
                  <button className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
