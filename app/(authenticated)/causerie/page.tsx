"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveSessions, ChatSession } from "@/lib/api";

function useCountdown(expiresAt: string): string {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      );
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return timeLeft;
}

function SessionCard({
  session,
  onClick,
}: {
  session: ChatSession;
  onClick: () => void;
}) {
  const timeLeft = useCountdown(session.expires_at);
  const isAlmostDone =
    new Date(session.expires_at).getTime() - Date.now() < 60000;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-2xl p-5 cursor-pointer hover:border-blue-200 hover:bg-blue-50 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
          {session.other_user_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            {session.other_user_name || "Someone"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Session active · tap to open
          </p>
        </div>
        <div className="text-right shrink-0">
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              isAlmostDone ? "text-red-500" : "text-blue-600"
            }`}
          >
            {timeLeft}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">remaining</p>
        </div>
      </div>
    </div>
  );
}

export default function CauseriePage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken({ skipCache: true });
        if (!token) return;
        const data = await getActiveSessions(token);
        setSessions(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [getToken]);

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
        <h1 className="text-2xl font-bold text-gray-900">Causerie</h1>
        <p className="text-sm text-gray-400 mt-1">Your active conversations</p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <p className="text-3xl mb-4">💬</p>
          <p className="font-medium text-gray-900 mb-1">
            No active conversations
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Accept a connection request to start chatting
          </p>
          <button
            onClick={() => router.push("/activity")}
            className="bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
          >
            View requests
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            {sessions.length} active{" "}
            {sessions.length === 1 ? "session" : "sessions"}
          </p>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onClick={() => router.push(`/session/${session.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
