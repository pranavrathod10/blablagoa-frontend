"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPendingRequests,
  getSentRequests,
  respondToRequest,
  ConnectionRequest,
  RespondResult,
} from "@/lib/api";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function timeLeft(expiresStr: string): string {
  const diff = new Date(expiresStr).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (mins < 60) return `${mins}m left`;
  return `${hrs}h left`;
}

const statusColors: Record<string, string> = {
  pending: "text-amber-600 bg-amber-50 border-amber-200",
  accepted: "text-green-600 bg-green-50 border-green-200",
  rejected: "text-red-500 bg-red-50 border-red-200",
  expired: "text-gray-400 bg-gray-50 border-gray-200",
};

export default function ActivityPage() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<"received" | "sent">("received");
  const [received, setReceived] = useState<ConnectionRequest[]>([]);
  const [sent, setSent] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<number | null>(null);

  async function load() {
    try {
      const token = await getToken({ skipCache: true });
      if (!token) return;
      const [pending, sentReqs] = await Promise.all([
        getPendingRequests(token),
        getSentRequests(token),
      ]);
      setReceived(pending);
      setSent(sentReqs);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [getToken]);

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
      await load();
    } catch {
      // silent
    } finally {
      setResponding(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
        <p className="text-sm text-gray-400 mt-1">
          Your connection requests — received and sent
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("received")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === "received"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Received
          {received.length > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {received.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === "sent"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Sent
        </button>
      </div>

      {/* Received tab */}
      {tab === "received" && (
        <div className="space-y-3">
          {received.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <p className="text-gray-400 text-sm">
                No pending requests right now
              </p>
            </div>
          ) : (
            received.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-gray-200 rounded-2xl p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                    {req.sender_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {req.sender_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {timeAgo(req.created_at)} · {timeLeft(req.expires_at)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    "{req.message}"
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(req.id, "accept")}
                    disabled={responding === req.id}
                    className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {responding === req.id ? "..." : "Accept"}
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, "reject")}
                    disabled={responding === req.id}
                    className="flex-1 border border-gray-200 text-gray-500 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sent tab */}
      {tab === "sent" && (
        <div className="space-y-3">
          {sent.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <p className="text-gray-400 text-sm">
                You haven't sent any requests yet
              </p>
            </div>
          ) : (
            sent.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-gray-200 rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold shrink-0">
                      {req.receiver_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {req.receiver_name || "User"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {timeAgo(req.created_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[req.status] || statusColors.expired}`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    "{req.message}"
                  </p>
                </div>

                {req.status === "pending" && (
                  <p className="text-xs text-gray-400 mt-2">
                    Expires in {timeLeft(req.expires_at)}
                  </p>
                )}

                {req.status === "accepted" && (
                  <button
                    onClick={() => router.push("/causerie")}
                    className="mt-3 w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Go to Causerie →
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
