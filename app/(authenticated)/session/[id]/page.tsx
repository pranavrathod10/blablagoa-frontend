"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useRef, useCallback } from "react";
import { getSession, createChatWebSocket, ChatSession } from "@/lib/api";

interface ChatMessage {
  id?: number;
  type: string;
  sender_id?: number;
  sender_name?: string;
  content?: string;
  sent_at?: string;
  message?: string;
  your_user_id?: number;
  user_id?: number;
  user_name?: string;
}

function Countdown({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState("");
  const [urgent, setUrgent] = useState(false);
  const expiredRef = useRef(false);

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00");
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpire();
        }
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
  }, [expiresAt, onExpire]);

  return (
    <div
      className={`text-3xl font-bold font-mono tabular-nums transition-colors ${
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [otherUserName, setOtherUserName] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSessionEnd = useCallback(() => {
    setSessionEnded(true);
    wsRef.current?.close();
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const token = await getToken({ skipCache: true });
        if (!token) return;

        // Load session info
        const data = await getSession(token, Number(id));
        setSession(data);
        setOtherUserName(data.other_user_name || "Someone");

        // Connect WebSocket
        const ws = createChatWebSocket(Number(id), token);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data) as ChatMessage;

          if (data.type === "session_info") {
            setMyUserId(data.your_user_id as number);
            return;
          }

          if (data.type === "session_ended") {
            setSessionEnded(true);
            return;
          }

          if (data.type === "message") {
            setMessages((prev) => [...prev, data]);
            return;
          }

          // user_joined, user_left — show as system message
          if (data.type === "user_joined" || data.type === "user_left") {
            setMessages((prev) => [
              ...prev,
              {
                type: "system",
                content:
                  data.type === "user_joined"
                    ? `${data.user_name} joined`
                    : `${data.user_name} left`,
              },
            ]);
          }
        };

        ws.onerror = () => {
          setConnected(false);
        };

        ws.onclose = () => {
          setConnected(false);
        };
      } catch {
        router.push("/causerie");
      } finally {
        setLoading(false);
      }
    }

    init();

    // Cleanup on unmount
    return () => {
      wsRef.current?.close();
    };
  }, [id, getToken, router]);

  function sendMessage() {
    if (!input.trim() || !wsRef.current || sessionEnded) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({ content: input.trim() }));
    setInput("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Session ended screen
  if (sessionEnded) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-10">
          <div className="text-5xl mb-6">⏱️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Session ended
          </h2>
          <p className="text-gray-500 text-sm mb-2">
            Your 5 minutes with {otherUserName} are up.
          </p>
          <p className="text-gray-400 text-xs mb-8">
            All messages have been deleted.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/connect")}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Find someone new
            </button>
            <button
              onClick={() => router.push("/causerie")}
              className="flex-1 border border-gray-200 text-gray-500 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              My sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/causerie")}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ←
          </button>
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
            {otherUserName[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {otherUserName}
            </p>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  connected ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className="text-xs text-gray-400">
                {connected ? "Connected" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>

        {/* Timer */}
        {session && (
          <div className="text-center">
            <Countdown
              expiresAt={session.expires_at}
              onExpire={handleSessionEnd}
            />
            <p className="text-xs text-gray-400 mt-0.5">remaining</p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">
              Say hello to {otherUserName} 👋
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => {
              // System message
              if (msg.type === "system") {
                return (
                  <div key={i} className="text-center">
                    <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              // Chat message
              const isMe = msg.sender_id === myUserId;
              return (
                <div
                  key={msg.id || i}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md ${
                      isMe
                        ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                        : "bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm"
                    } px-4 py-2.5`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    {msg.sent_at && (
                      <p
                        className={`text-xs mt-1 ${
                          isMe ? "text-blue-200" : "text-gray-400"
                        }`}
                      >
                        {new Date(msg.sent_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 flex gap-3 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={500}
          disabled={!connected || sessionEnded}
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !connected || sessionEnded}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
