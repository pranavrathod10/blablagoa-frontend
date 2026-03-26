"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  updateLocation,
  updatePresence,
  getNearbyUsers,
  updateDiscoverySettings,
  sendConnectionRequest,
  getPendingRequests,
  respondToRequest,
  NearbyUser,
  ConnectionRequest,
  RespondResult,
} from "@/lib/api";

async function getLocationName(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "BlaBlaGoa/1.0",
        },
      },
    );
    const data = await response.json();
    const a = data.address;
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.neighbourhood || a.suburb || a.quarter,
      a.village || a.hamlet || a.town || a.city_district,
      a.city || a.municipality || a.county,
      a.state,
    ].filter(Boolean);
    return parts.length > 0
      ? parts.join(", ")
      : data.display_name.split(",").slice(0, 4).join(",").trim();
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function ConnectPage() {
  const { getToken } = useAuth();
  const router = useRouter();

  // Location + nearby state
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [radius, setRadius] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");
  const radiusDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Modal + request state
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Incoming requests state
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>(
    [],
  );
  const [responding, setResponding] = useState<number | null>(null);

  // Heartbeat — keeps user online while on this page
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

  // Poll for incoming requests every 10 seconds
  useEffect(() => {
    async function checkRequests() {
      try {
        const token = await getToken({ skipCache: true });
        if (!token) return;
        const pending = await getPendingRequests(token);
        setPendingRequests(pending);
      } catch {
        // silent fail
      }
    }

    checkRequests();
    const interval = setInterval(checkRequests, 10000);
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
    if (radiusDebounceRef.current) clearTimeout(radiusDebounceRef.current);
    radiusDebounceRef.current = setTimeout(async () => {
      const token = await getToken({ skipCache: true });
      if (!token) return;
      await updateDiscoverySettings(token, { discovery_radius_km: newRadius });
      if (locationSet) await fetchNearbyUsers(token);
    }, 500);
  }

  // Send connection request
  async function handleSendRequest() {
    if (!selectedUser || !requestMessage.trim()) return;
    setSendingRequest(true);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) return;
      await sendConnectionRequest(
        token,
        selectedUser.id,
        requestMessage.trim(),
      );
      setRequestSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send request.");
    } finally {
      setSendingRequest(false);
    }
  }

  // Respond to incoming request
  async function handleRespond(requestId: number, action: "accept" | "reject") {
    setResponding(requestId);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) return;
      const result = (await respondToRequest(
        token,
        requestId,
        action,
      )) as RespondResult;
      if (action === "accept" && result.session_id) {
        router.push(`/session/${result.session_id}`);
        return;
      }
      // Refresh pending list after reject
      const pending = await getPendingRequests(token);
      setPendingRequests(pending);
    } catch {
      setError("Failed to respond to request.");
    } finally {
      setResponding(null);
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left panel — controls */}
      <div className="w-72 shrink-0 bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Find people nearby
          </h2>
          <p className="text-sm text-gray-400">
            Set your location to see who is online around you
          </p>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Your location
          </label>

          {locationSet ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-green-700 font-medium leading-relaxed break-words">
                    {locationName}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setLocationSet(false);
                    setLocationName("");
                    setNearbyUsers([]);
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 shrink-0 ml-1"
                >
                  Change
                </button>
              </div>
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

        {/* Radius slider */}
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

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Refresh */}
        {locationSet && (
          <button
            onClick={() => fetchNearbyUsers()}
            className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors mt-auto"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Right panel — nearby users */}
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
            <p className="text-gray-700 font-medium mb-2">
              No one nearby right now
            </p>
            <p className="text-gray-400 text-sm max-w-xs">
              People appear here when they open the Connect page. Try increasing
              your radius or check back in a few minutes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => {
                  setSelectedUser(u);
                  setRequestSent(false);
                  setRequestMessage("");
                }}
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
                  <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                    View
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming requests — fixed bottom right */}
      {pendingRequests.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-gray-200 rounded-2xl p-4 shadow-lg"
            >
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
                Incoming request
              </p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                  {req.sender_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {req.sender_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {req.sender_bio || "No bio"}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  "{req.message}"
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRespond(req.id, "accept")}
                  disabled={responding === req.id}
                  className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {responding === req.id ? "..." : "Accept"}
                </button>
                <button
                  onClick={() => handleRespond(req.id, "reject")}
                  disabled={responding === req.id}
                  className="flex-1 border border-gray-200 text-gray-500 text-sm font-medium py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedUser(null);
            setRequestSent(false);
            setRequestMessage("");
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                {selectedUser.name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {selectedUser.name}
                </p>
                <p className="text-xs text-gray-400">
                  {selectedUser.distance_km} km away · Online
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setRequestSent(false);
                  setRequestMessage("");
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {selectedUser.bio && (
              <p className="text-sm text-gray-600 mb-4 leading-relaxed bg-gray-50 rounded-xl p-3">
                {selectedUser.bio}
              </p>
            )}

            {requestSent ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-green-700">
                  Request sent!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Waiting for {selectedUser.name} to respond. Check Activity
                  page for updates.
                </p>
                <button
                  onClick={() => router.push("/activity")}
                  className="mt-3 text-xs text-blue-600 font-medium"
                >
                  Go to Activity →
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Your message
                  </label>
                  <textarea
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Tell them why you want to connect..."
                    rows={3}
                    maxLength={200}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none"
                  />
                  <p className="text-xs text-gray-400 text-right">
                    {requestMessage.length}/200
                  </p>
                </div>
                <button
                  onClick={handleSendRequest}
                  disabled={sendingRequest || !requestMessage.trim()}
                  className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingRequest ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Send request"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
