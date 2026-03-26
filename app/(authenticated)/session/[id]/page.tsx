"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getSession, ChatSession } from "@/lib/api";

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [urgent, setUrgent] = useState(false);

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
      setUrgent(diff < 60000);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div
      className={`text-4xl font-bold font-mono tabular-nums ${
        urgent ? "text-red-500" : "text-blue-600"
      }`}
    >
      {timeLeft}
    </div>
  );
}

export default function SessionPage() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken({ skipCache: true });
        if (!token) return;
        const data = await getSession(token, Number(id));
        setSession(data);
      } catch {
        router.push("/causerie");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, getToken, router]);

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Session header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
            {session.other_user_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {session.other_user_name}
            </p>
            <p className="text-xs text-gray-400">Active session</p>
          </div>
        </div>
        <div className="text-center">
          <Countdown expiresAt={session.expires_at} />
          <p className="text-xs text-gray-400 mt-1">remaining</p>
        </div>
      </div>

      {/* Chat placeholder */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center min-h-64 flex flex-col items-center justify-center">
        <p className="text-gray-400 text-sm">
          Real-time chat coming in Step 18
        </p>
      </div>
    </div>
  );
}
